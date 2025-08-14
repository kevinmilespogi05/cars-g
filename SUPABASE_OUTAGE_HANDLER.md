# Supabase Outage Handler

A comprehensive solution for handling Supabase outages and providing graceful degradation in your Cars-G application. This system ensures your app continues to work even when Supabase is unavailable.

## 🚀 Features

### **Automatic Outage Detection**
- Real-time monitoring of Supabase connection status
- Automatic health checks every 30 seconds
- Network status monitoring (online/offline)
- Intelligent error classification (network vs. Supabase-specific)

### **Graceful Degradation**
- App continues running with cached data during outages
- Offline mode with limited functionality
- Automatic retry with exponential backoff
- User-friendly outage notifications

### **Offline Support**
- Local data caching for critical user information
- Offline action queuing for later sync
- Persistent user sessions during outages
- Smart cache invalidation and cleanup

### **Enhanced User Experience**
- Real-time status indicators
- Manual retry options
- Outage duration tracking
- Clear communication about app state

## 📁 File Structure

```
src/
├── lib/
│   ├── supabaseOutageHandler.ts    # Core outage handling logic
│   └── supabase.ts                 # Supabase client configuration
├── components/
│   ├── SupabaseOutageIndicator.tsx # Status indicator component
│   └── NetworkStatus.tsx           # Network status component
├── store/
│   └── enhancedAuthStore.ts        # Enhanced auth with offline support
└── App.tsx                         # Main app with outage provider
```

## 🛠️ Installation & Setup

### 1. **Wrap Your App with OutageProvider**

```tsx
import { OutageProvider } from './lib/supabaseOutageHandler';
import { supabase } from './lib/supabase';

function App() {
  return (
    <OutageProvider supabase={supabase}>
      {/* Your app components */}
    </OutageProvider>
  );
}
```

### 2. **Use the Outage Handler Hook**

```tsx
import { useOutageHandler } from './lib/supabaseOutageHandler';

function MyComponent() {
  const { state, checkConnection, retryConnection } = useOutageHandler();
  
  return (
    <div>
      {state.isOutage && (
        <div>Supabase is currently unavailable</div>
      )}
    </div>
  );
}
```

### 3. **Add Status Indicators**

```tsx
import { SupabaseOutageIndicator } from './components/SupabaseOutageIndicator';

function App() {
  return (
    <div>
      <SupabaseOutageIndicator />
      {/* Your app content */}
    </div>
  );
}
```

## 🔧 Configuration

### **Outage Handler Settings**

```typescript
// Default configuration in supabaseOutageHandler.ts
const defaultOutageState = {
  maxRetries: 5,           // Maximum retry attempts
  retryDelay: 5000,        // Initial retry delay (5 seconds)
  healthCheckInterval: 30000, // Health check frequency (30 seconds)
  cacheTTL: 24 * 60 * 60 * 1000 // Cache TTL (24 hours)
};
```

### **Customizing Health Checks**

```typescript
// Modify the health check query in checkConnection()
const { data, error } = await supabase
  .from('profiles')
  .select('count')
  .limit(1)
  .single();
```

## 📱 Usage Examples

### **Basic Outage Detection**

```tsx
import { useOutageHandler } from './lib/supabaseOutageHandler';

function StatusComponent() {
  const { state } = useOutageHandler();
  
  if (state.isOutage) {
    return <div>⚠️ Supabase is currently unavailable</div>;
  }
  
  return <div>✅ Supabase is connected</div>;
}
```

### **Manual Connection Retry**

```tsx
function RetryButton() {
  const { retryConnection, state } = useOutageHandler();
  
  return (
    <button 
      onClick={retryConnection}
      disabled={state.isConnecting}
    >
      {state.isConnecting ? 'Retrying...' : 'Retry Connection'}
    </button>
  );
}
```

### **Service Availability Check**

```tsx
function DataComponent() {
  const { isServiceAvailable, getFallbackData } = useOutageHandler();
  
  if (isServiceAvailable('database')) {
    // Use live Supabase data
    return <LiveDataComponent />;
  } else {
    // Use cached data
    const cachedData = getFallbackData('database');
    return <CachedDataComponent data={cachedData} />;
  }
}
```

### **Enhanced Auth Store Usage**

```tsx
import { useEnhancedAuthStore } from './store/enhancedAuthStore';

function ProfileComponent() {
  const { user, isOfflineMode, syncOfflineData } = useEnhancedAuthStore();
  
  useEffect(() => {
    if (!isOfflineMode()) {
      syncOfflineData(); // Sync any offline changes
    }
  }, [isOfflineMode]);
  
  return (
    <div>
      <h1>Welcome, {user?.username}</h1>
      {isOfflineMode() && (
        <div className="text-yellow-600">
          ⚠️ Running in offline mode
        </div>
      )}
    </div>
  );
}
```

## 🔄 Offline Data Management

### **Caching Data**

```typescript
import { outageUtils } from './lib/supabaseOutageHandler';

// Cache data for offline use
const cacheData = (service: string, data: any) => {
  try {
    localStorage.setItem(`supabase_cache_${service}`, JSON.stringify({
      data,
      timestamp: Date.now(),
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    }));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
};
```

### **Retrieving Cached Data**

```typescript
const getCachedData = (service: string) => {
  try {
    const cached = localStorage.getItem(`supabase_cache_${service}`);
    if (cached) {
      const { data, timestamp, ttl } = JSON.parse(cached);
      if (outageUtils.isCacheValid(timestamp, ttl)) {
        return data;
      }
    }
    return null;
  } catch {
    return null;
  }
};
```

### **Clearing Expired Cache**

```typescript
// Automatically clear expired cache entries
outageUtils.clearExpiredCache();
```

## 🎯 Best Practices

### **1. Graceful Degradation**
- Always provide fallback UI for offline states
- Cache critical user data when possible
- Queue non-critical actions for later sync

### **2. User Communication**
- Clearly indicate when the app is running offline
- Show outage duration and retry options
- Provide helpful error messages

### **3. Performance Optimization**
- Use appropriate cache TTLs
- Implement smart retry strategies
- Monitor and log outage patterns

### **4. Testing**
- Test offline scenarios regularly
- Simulate network failures
- Verify cache behavior

## 🚨 Error Handling

### **Network Errors**
- `Failed to fetch` - Network connectivity issues
- `ERR_INTERNET_DISCONNECTED` - No internet connection
- `NetworkError` - General network problems

### **Supabase Errors**
- `PGRST*` - Database-related errors
- `AUTH*` - Authentication errors
- Connection timeouts and service unavailability

### **Custom Error Messages**

```typescript
function getEnhancedErrorMessage(error: any): string {
  if (error.message?.includes('Failed to fetch')) {
    return 'No internet connection. Please check your network and try again.';
  }
  
  if (error.message?.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}
```

## 📊 Monitoring & Analytics

### **Outage Metrics**
- Track outage frequency and duration
- Monitor retry success rates
- Log user experience during outages

### **Performance Metrics**
- Cache hit/miss ratios
- Offline mode usage
- Sync success rates

## 🔧 Troubleshooting

### **Common Issues**

1. **Outage handler not detecting issues**
   - Check health check query configuration
   - Verify network event listeners
   - Review console logs for errors

2. **Cache not working**
   - Verify localStorage availability
   - Check cache TTL settings
   - Ensure proper cache key naming

3. **Retry not working**
   - Check max retry configuration
   - Verify retry delay settings
   - Review exponential backoff logic

### **Debug Mode**

```typescript
// Enable debug logging
const DEBUG_MODE = true;

if (DEBUG_MODE) {
  console.log('Outage state:', state);
  console.log('Connection status:', state.connectionStatus);
  console.log('Retry count:', state.retryCount);
}
```

## 🚀 Future Enhancements

### **Planned Features**
- WebSocket-based real-time status updates
- Advanced caching strategies
- Offline-first data synchronization
- Predictive outage detection
- User preference management

### **Integration Opportunities**
- Service Worker integration
- Push notifications for status changes
- Advanced analytics and reporting
- Multi-region failover support

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Offline-First Development](https://web.dev/offline-cookbook/)
- [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)

---

**Note**: This outage handler is designed to work seamlessly with your existing Supabase setup. It automatically detects and handles outages while maintaining a smooth user experience. For production use, consider implementing additional monitoring and alerting systems.
