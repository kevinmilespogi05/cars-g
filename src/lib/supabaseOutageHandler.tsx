import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Types for outage handling
export interface OutageState {
  isOutage: boolean;
  isConnecting: boolean;
  lastConnected: Date | null;
  outageStart: Date | null;
  retryCount: number;
  maxRetries: number;
  retryDelay: number;
  connectionStatus: 'online' | 'offline' | 'connecting' | 'degraded';
}

export interface OutageHandler {
  state: OutageState;
  checkConnection: () => Promise<boolean>;
  retryConnection: () => Promise<void>;
  resetOutageState: () => void;
  isServiceAvailable: (service: 'auth' | 'database' | 'storage' | 'realtime') => boolean;
  getFallbackData: (service: 'auth' | 'database' | 'storage' | 'realtime') => any;
}

// Default outage state
const defaultOutageState: OutageState = {
  isOutage: false,
  isConnecting: false,
  lastConnected: null,
  outageStart: null,
  retryCount: 0,
  maxRetries: 5,
  retryDelay: 5000, // 5 seconds
  connectionStatus: 'online'
};

// Outage context
const OutageContext = createContext<OutageHandler | null>(null);

// Main outage handler class
class SupabaseOutageHandler implements OutageHandler {
  private supabase: SupabaseClient;
  private state: OutageState;
  private retryTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(state: OutageState) => void> = new Set();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.state = { ...defaultOutageState };
    this.initializeHealthCheck();
  }

  // Initialize periodic health checks
  private initializeHealthCheck() {
    // Check connection every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkConnection();
    }, 30000);

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  // Handle network changes
  private handleNetworkChange(isOnline: boolean) {
    if (isOnline && this.state.connectionStatus === 'offline') {
      this.state.connectionStatus = 'connecting';
      this.checkConnection();
    } else if (!isOnline) {
      this.state.connectionStatus = 'offline';
      this.notifyListeners();
    }
  }

  // Check if Supabase is accessible
  async checkConnection(): Promise<boolean> {
    if (this.state.isConnecting) return false;

    this.state.isConnecting = true;
    this.state.connectionStatus = 'connecting';
    this.notifyListeners();

    try {
      // Try a simple health check query
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
        throw error;
      }

      // Connection successful
      this.handleConnectionSuccess();
      return true;
    } catch (error: any) {
      console.warn('Supabase connection check failed:', error);
      this.handleConnectionFailure(error);
      return false;
    } finally {
      this.state.isConnecting = false;
      this.notifyListeners();
    }
  }

  // Handle successful connection
  private handleConnectionSuccess() {
    this.state.isOutage = false;
    this.state.connectionStatus = 'online';
    this.state.lastConnected = new Date();
    this.state.outageStart = null;
    this.state.retryCount = 0;

    // Clear any pending retry
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.notifyListeners();
  }

  // Handle connection failure
  private handleConnectionFailure(error: any) {
    const isNetworkError = this.isNetworkError(error);
    const isSupabaseError = this.isSupabaseError(error);

    if (isNetworkError || isSupabaseError) {
      this.state.isOutage = true;
      this.state.connectionStatus = 'offline';
      
      if (!this.state.outageStart) {
        this.state.outageStart = new Date();
      }

      // Schedule retry if we haven't exceeded max retries
      if (this.state.retryCount < this.state.maxRetries) {
        this.scheduleRetry();
      }
    }

    this.notifyListeners();
  }

  // Check if error is network-related
  private isNetworkError(error: any): boolean {
    return (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
      error.message?.includes('ERR_NETWORK') ||
      !navigator.onLine
    );
  }

  // Check if error is Supabase-specific
  private isSupabaseError(error: any): boolean {
    return (
      error.code?.startsWith('PGRST') ||
      error.code?.startsWith('AUTH') ||
      error.message?.includes('supabase') ||
      error.message?.includes('postgres')
    );
  }

  // Schedule retry with exponential backoff
  private scheduleRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    const delay = this.state.retryDelay * Math.pow(2, this.state.retryCount);
    
    this.retryTimeout = setTimeout(() => {
      this.state.retryCount++;
      this.retryConnection();
    }, delay);
  }

  // Retry connection manually
  async retryConnection(): Promise<void> {
    if (this.state.isConnecting) return;

    this.state.retryCount = 0; // Reset retry count for manual retry
    await this.checkConnection();
  }

  // Reset outage state
  resetOutageState(): void {
    this.state = { ...defaultOutageState };
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    this.notifyListeners();
  }

  // Check if a specific service is available
  isServiceAvailable(service: 'auth' | 'database' | 'storage' | 'realtime'): boolean {
    if (this.state.isOutage) return false;
    
    // Check if we have cached data for offline mode
    const hasCachedData = this.hasCachedData(service);
    
    return hasCachedData || this.state.connectionStatus === 'online';
  }

  // Check if we have cached data for a service
  private hasCachedData(service: string): boolean {
    try {
      const cached = localStorage.getItem(`supabase_cache_${service}`);
      return cached !== null;
    } catch {
      return false;
    }
  }

  // Get fallback data for a service
  getFallbackData(service: 'auth' | 'database' | 'storage' | 'realtime'): any {
    try {
      const cached = localStorage.getItem(`supabase_cache_${service}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  // Cache data for offline use
  cacheData(service: string, data: any): void {
    try {
      localStorage.setItem(`supabase_cache_${service}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      }));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  // Get current state
  getState(): OutageState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: (state: OutageState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.listeners.clear();
  }
}

// React hook for using the outage handler
export function useOutageHandler(): OutageHandler {
  const context = useContext(OutageContext);
  if (!context) {
    throw new Error('useOutageHandler must be used within an OutageProvider');
  }
  return context;
}

// Provider component
interface OutageProviderProps {
  children: ReactNode;
  supabase: SupabaseClient;
}

export function OutageProvider({ children, supabase }: OutageProviderProps) {
  const [outageHandler] = useState(() => new SupabaseOutageHandler(supabase));
  const [state, setState] = useState<OutageState>(outageHandler.getState());

  useEffect(() => {
    const unsubscribe = outageHandler.subscribe(setState);
    return () => {
      unsubscribe();
      outageHandler.destroy();
    };
  }, [outageHandler]);

  const handler: OutageHandler = {
    state,
    checkConnection: () => outageHandler.checkConnection(),
    retryConnection: () => outageHandler.retryConnection(),
    resetOutageState: () => outageHandler.resetOutageState(),
    isServiceAvailable: (service) => outageHandler.isServiceAvailable(service),
    getFallbackData: (service) => outageHandler.getFallbackData(service)
  };

  return (
    <OutageContext.Provider value={handler}>
      {children}
    </OutageContext.Provider>
  );
}

// Utility functions for working with cached data
export const outageUtils = {
  // Check if cached data is still valid
  isCacheValid(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl;
  },

  // Get cache age in minutes
  getCacheAge(timestamp: number): number {
    return Math.floor((Date.now() - timestamp) / (1000 * 60));
  },

  // Clear expired cache entries
  clearExpiredCache(): void {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase_cache_')) {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const { timestamp, ttl } = JSON.parse(cached);
              if (!this.isCacheValid(timestamp, ttl)) {
                localStorage.removeItem(key);
              }
            } catch {
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  }
};
