// Enhanced Geolocation Utilities for High Precision Location Services - OPTIMIZED VERSION

export interface EnhancedLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
  method: 'gps' | 'ip' | 'manual';
}

export interface GeolocationOptions {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  maxRetries?: number;
  minAccuracy?: number;
}

// OPTIMIZED options for faster location acquisition
export const GEOLOCATION_OPTIONS = {
  ULTRA_FAST: {
    enableHighAccuracy: true,
    timeout: 8000,        // 8 seconds - much faster
    maximumAge: 5000,     // Accept positions up to 5 seconds old
    maxRetries: 2,        // Reduced retries for speed
    minAccuracy: 20,      // 20 meters - good balance of speed/accuracy
  },
  HIGH_PRECISION: {
    enableHighAccuracy: true,
    timeout: 15000,       // 15 seconds - reduced from 30
    maximumAge: 0,        // Always get fresh position
    maxRetries: 3,        // Up to 3 attempts
    minAccuracy: 10,      // 10-meter precision target
  },
  STANDARD: {
    enableHighAccuracy: false,
    timeout: 8000,        // 8 seconds - reduced from 15
    maximumAge: 15000,    // Accept positions up to 15 seconds old
    maxRetries: 2,        // Up to 2 attempts
    minAccuracy: 50,      // 50-meter precision target
  },
  FAST: {
    enableHighAccuracy: false,
    timeout: 3000,        // 3 seconds - very fast
    maximumAge: 30000,    // Accept positions up to 30 seconds old
    maxRetries: 1,        // Single attempt
    minAccuracy: 100,     // 100-meter precision target
  },
} as const;

// Location cache for faster subsequent requests
const locationCache = new Map<string, { location: EnhancedLocation; expires: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// Get cached location if available and not expired
const getCachedLocation = (): EnhancedLocation | null => {
  const now = Date.now();
  for (const [key, cached] of locationCache.entries()) {
    if (cached.expires > now) {
      return cached.location;
    } else {
      locationCache.delete(key);
    }
  }
  return null;
};

// Cache a location for future use
const cacheLocation = (location: EnhancedLocation) => {
  const key = `${location.lat.toFixed(6)}_${location.lng.toFixed(6)}`;
  locationCache.set(key, {
    location,
    expires: Date.now() + CACHE_DURATION
  });
};

// Calculate weighted average position from multiple readings
export const calculateAveragePosition = (locations: EnhancedLocation[]): { lat: number; lng: number; accuracy: number } => {
  if (locations.length === 0) {
    return { lat: 0, lng: 0, accuracy: 0 };
  }

  if (locations.length === 1) {
    return { 
      lat: locations[0].lat, 
      lng: locations[0].lng, 
      accuracy: locations[0].accuracy || 0 
    };
  }

  const now = Date.now();
  let totalWeightedLat = 0;
  let totalWeightedLng = 0;
  let totalWeight = 0;

  locations.forEach(location => {
    // Time weight: newer readings have higher weight (decay over 1 minute - reduced from 2)
    const timeWeight = Math.max(0, 1 - (now - location.timestamp) / 60000);
    
    // Accuracy weight: more accurate readings have higher weight
    const accuracyWeight = location.accuracy ? 1 / location.accuracy : 1;
    
    // Method weight: GPS readings are preferred over IP-based
    const methodWeight = location.method === 'gps' ? 1 : 0.3;
    
    const totalWeightForLocation = timeWeight * accuracyWeight * methodWeight;
    
    totalWeightedLat += location.lat * totalWeightForLocation;
    totalWeightedLng += location.lng * totalWeightForLocation;
    totalWeight += totalWeightForLocation;
  });

  const avgLat = totalWeightedLat / totalWeight;
  const avgLng = totalWeightedLng / totalWeight;

  // Calculate weighted accuracy
  const weightedAccuracy = locations.reduce((sum, loc) => {
    const timeWeight = Math.max(0, 1 - (now - loc.timestamp) / 60000);
    const methodWeight = loc.method === 'gps' ? 1 : 0.3;
    return sum + ((loc.accuracy || 0) * timeWeight * methodWeight);
  }, 0) / totalWeight;

  return { lat: avgLat, lng: avgLng, accuracy: weightedAccuracy };
};

// OPTIMIZED: Get position with faster retry mechanism and early return
export const getPositionWithRetry = (
  options: GeolocationOptions
): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxRetries = options.maxRetries || 2;
    const startTime = Date.now();

    const tryGetPosition = () => {
      attempts++;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          const minAccuracy = options.minAccuracy || 100;
          const elapsed = Date.now() - startTime;

          // EARLY RETURN: If accuracy is good enough, return immediately
          if (accuracy && accuracy <= minAccuracy) {
            resolve(position);
            return;
          }

          // EARLY RETURN: If we've been trying too long, accept current accuracy
          if (elapsed > 10000) { // 10 seconds max total time
            console.log(`Accepting location with accuracy ${accuracy}m after ${elapsed}ms (time limit reached)`);
            resolve(position);
            return;
          }

          // Retry if we have attempts left and accuracy isn't good enough
          if (attempts < maxRetries) {
            console.log(`Location accuracy ${accuracy}m not sufficient (need <${minAccuracy}m), retrying...`);
            setTimeout(tryGetPosition, 500 * attempts); // Faster backoff: 500ms, 1000ms
          } else {
            // Accept the position even if accuracy isn't ideal
            console.log(`Accepting location with accuracy ${accuracy}m after ${attempts} attempts`);
            resolve(position);
          }
        },
        (error) => {
          if (attempts < maxRetries) {
            console.log(`Location attempt ${attempts} failed, retrying...`);
            setTimeout(tryGetPosition, 500 * attempts);
          } else {
            reject(error);
          }
        },
        options
      );
    };

    tryGetPosition();
  });
};

// OPTIMIZED: IP-based geolocation with multiple providers for redundancy
export const getIPBasedLocation = async (): Promise<EnhancedLocation | null> => {
  const providers = [
    'https://ipapi.co/json/',
    'https://ipinfo.io/json',
    'https://api.ipify.org?format=json'
  ];

  // Try providers in parallel for fastest response
  const promises = providers.map(async (provider) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout per provider
      
      const response = await fetch(provider, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          return {
            lat: data.latitude,
            lng: data.longitude,
            accuracy: 5000, // IP-based location is very approximate
            timestamp: Date.now(),
            method: 'ip',
          };
        }
      }
    } catch (error) {
      // Silently fail and try next provider
    }
    return null;
  });

  // Return the first successful result
  for (const promise of promises) {
    const result = await promise;
    if (result) return result;
  }

  return null;
};

// OPTIMIZED: Enhanced location getting with parallel processing and early return
export const getEnhancedLocation = async (
  options: GeolocationOptions = GEOLOCATION_OPTIONS.ULTRA_FAST
): Promise<EnhancedLocation> => {
  // Check cache first for instant results
  const cached = getCachedLocation();
  if (cached) {
    console.log('Using cached location for instant response');
    return cached;
  }

  const startTime = Date.now();
  const locationHistory: EnhancedLocation[] = [];
  const maxTotalTime = 12000; // 12 seconds maximum total time

  // PARALLEL PROCESSING: Try multiple methods simultaneously
  const promises = [
    // Method 1: High accuracy GPS (primary)
    (async () => {
      try {
        const gpsPosition = await getPositionWithRetry(options);
        const enhancedLocation: EnhancedLocation = {
          lat: gpsPosition.coords.latitude,
          lng: gpsPosition.coords.longitude,
          accuracy: gpsPosition.coords.accuracy || undefined,
          timestamp: Date.now(),
          method: 'gps',
        };
        
        locationHistory.push(enhancedLocation);
        
        // EARLY RETURN: If accuracy is excellent, return immediately
        if (enhancedLocation.accuracy && enhancedLocation.accuracy <= 15) {
          console.log(`Excellent accuracy ${enhancedLocation.accuracy}m achieved in ${Date.now() - startTime}ms`);
          cacheLocation(enhancedLocation);
          return enhancedLocation;
        }
        
        return enhancedLocation;
      } catch (error) {
        console.log('High accuracy GPS failed');
        return null;
      }
    })(),

    // Method 2: Standard accuracy GPS (fallback)
    (async () => {
      try {
        const standardOptions = { ...options, enableHighAccuracy: false, timeout: 5000 };
        const standardPosition = await getPositionWithRetry(standardOptions);
        const enhancedLocation: EnhancedLocation = {
          lat: standardPosition.coords.latitude,
          lng: standardPosition.coords.longitude,
          accuracy: standardPosition.coords.accuracy || undefined,
          timestamp: Date.now(),
          method: 'gps',
        };
        
        locationHistory.push(enhancedLocation);
        return enhancedLocation;
      } catch (error) {
        console.log('Standard GPS failed');
        return null;
      }
    })(),

    // Method 3: IP-based geolocation (last resort)
    getIPBasedLocation(),
  ];

  // Wait for first successful result or timeout
  let bestLocation: EnhancedLocation | null = null;
  
  try {
    // Use Promise.race to get the fastest result
    const fastestResult = await Promise.race([
      Promise.any(promises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), maxTotalTime))
    ]);

    if (fastestResult) {
      bestLocation = fastestResult;
      console.log(`Fastest location method completed in ${Date.now() - startTime}ms`);
    }
  } catch (error) {
    console.log('All parallel methods failed or timed out');
  }

  // If we got a good result, return it immediately
  if (bestLocation && bestLocation.accuracy && bestLocation.accuracy <= (options.minAccuracy || 50)) {
    cacheLocation(bestLocation);
    return bestLocation;
  }

  // Wait for remaining promises to complete for better accuracy
  const results = await Promise.allSettled(promises);
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      locationHistory.push(result.value);
    }
  });

  // Return the best available location
  if (locationHistory.length > 0) {
    const avgPosition = calculateAveragePosition(locationHistory);
    const finalLocation: EnhancedLocation = {
      lat: avgPosition.lat,
      lng: avgPosition.lng,
      accuracy: avgPosition.accuracy,
      timestamp: Date.now(),
      method: locationHistory[0].method,
    };
    
    cacheLocation(finalLocation);
    console.log(`Final location achieved in ${Date.now() - startTime}ms with accuracy ${finalLocation.accuracy}m`);
    return finalLocation;
  }

  throw new Error('All location methods failed');
};

// OPTIMIZED: Start continuous location monitoring with faster updates
export const startLocationMonitoring = (
  onLocationUpdate: (location: EnhancedLocation) => void,
  options: GeolocationOptions = GEOLOCATION_OPTIONS.ULTRA_FAST
): (() => void) => {
  let watchId: number | null = null;
  const locationHistory: EnhancedLocation[] = [];
  let lastUpdate = 0;
  const minUpdateInterval = 2000; // Minimum 2 seconds between updates

  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        
        // Rate limiting to prevent too frequent updates
        if (now - lastUpdate < minUpdateInterval) {
          return;
        }

        const enhancedLocation: EnhancedLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          timestamp: now,
          method: 'gps',
        };

        locationHistory.push(enhancedLocation);
        lastUpdate = now;

        // Keep only recent readings (last 20 seconds - reduced from 30)
        const twentySecondsAgo = now - 20000;
        const recentLocations = locationHistory.filter(
          loc => loc.timestamp > twentySecondsAgo
        );

        // Update history array
        locationHistory.length = 0;
        locationHistory.push(...recentLocations);

        // Use averaged position if we have multiple readings
        if (recentLocations.length >= 2) {
          const avgPosition = calculateAveragePosition(recentLocations);
          onLocationUpdate({
            lat: avgPosition.lat,
            lng: avgPosition.lng,
            accuracy: avgPosition.accuracy,
            timestamp: now,
            method: 'gps',
          });
        } else {
          onLocationUpdate(enhancedLocation);
        }
      },
      (error) => {
        console.error('Location monitoring error:', error);
      },
      options
    );
  }

  // Return cleanup function
  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
};

// Format location for display
export const formatLocation = (location: EnhancedLocation): string => {
  const coords = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
  const accuracy = location.accuracy ? ` (Accuracy: ±${Math.round(location.accuracy)}m)` : '';
  const method = location.method === 'gps' ? 'GPS' : 'IP-based';
  
  return `${coords}${accuracy} [${method}]`;
};

// Calculate distance between two points in meters
export const calculateDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Check if two locations are within a certain distance
export const isWithinDistance = (
  location1: EnhancedLocation,
  location2: EnhancedLocation,
  maxDistance: number
): boolean => {
  const distance = calculateDistance(
    location1.lat, location1.lng,
    location2.lat, location2.lng
  );
  return distance <= maxDistance;
};

// NEW: Get location with speed priority
export const getFastLocation = async (): Promise<EnhancedLocation> => {
  return getEnhancedLocation(GEOLOCATION_OPTIONS.ULTRA_FAST);
};

// NEW: Get location with accuracy priority
export const getAccurateLocation = async (): Promise<EnhancedLocation> => {
  return getEnhancedLocation(GEOLOCATION_OPTIONS.HIGH_PRECISION);
};

// NEW: Clear location cache
export const clearLocationCache = (): void => {
  locationCache.clear();
};
