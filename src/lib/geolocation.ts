// Enhanced Geolocation Utilities for High Precision Location Services

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

// Default options for different precision levels
export const GEOLOCATION_OPTIONS = {
  HIGH_PRECISION: {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 0,
    maxRetries: 3,
    minAccuracy: 10, // 10 meters
  },
  STANDARD: {
    enableHighAccuracy: false,
    timeout: 15000,
    maximumAge: 10000,
    maxRetries: 2,
    minAccuracy: 50, // 50 meters
  },
  FAST: {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 30000,
    maxRetries: 1,
    minAccuracy: 100, // 100 meters
  },
} as const;

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
    // Time weight: newer readings have higher weight (decay over 2 minutes)
    const timeWeight = Math.max(0, 1 - (now - location.timestamp) / 120000);
    
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
    const timeWeight = Math.max(0, 1 - (now - loc.timestamp) / 120000);
    const methodWeight = loc.method === 'gps' ? 1 : 0.3;
    return sum + ((loc.accuracy || 0) * timeWeight * methodWeight);
  }, 0) / totalWeight;

  return { lat: avgLat, lng: avgLng, accuracy: weightedAccuracy };
};

// Get position with retry mechanism and accuracy checking
export const getPositionWithRetry = (
  options: GeolocationOptions
): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxRetries = options.maxRetries || 3;

    const tryGetPosition = () => {
      attempts++;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          const minAccuracy = options.minAccuracy || 100;

          // Check if accuracy meets minimum requirements
          if (accuracy && accuracy <= minAccuracy) {
            resolve(position);
          } else if (attempts < maxRetries) {
            console.log(`Location accuracy ${accuracy}m not sufficient (need <${minAccuracy}m), retrying...`);
            setTimeout(tryGetPosition, 1000 * attempts); // Exponential backoff
          } else {
            // Accept the position even if accuracy isn't ideal
            console.log(`Accepting location with accuracy ${accuracy}m after ${attempts} attempts`);
            resolve(position);
          }
        },
        (error) => {
          if (attempts < maxRetries) {
            console.log(`Location attempt ${attempts} failed, retrying...`);
            setTimeout(tryGetPosition, 1000 * attempts);
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

// IP-based geolocation fallback
export const getIPBasedLocation = async (): Promise<EnhancedLocation | null> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
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
  } catch (error) {
    console.error('IP-based location failed:', error);
  }
  return null;
};

// Enhanced location getting with multiple methods
export const getEnhancedLocation = async (
  options: GeolocationOptions = GEOLOCATION_OPTIONS.HIGH_PRECISION
): Promise<EnhancedLocation> => {
  const locationHistory: EnhancedLocation[] = [];

  // Method 1: Try high accuracy GPS positioning
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
    
    // If accuracy is good enough, return immediately
    if (enhancedLocation.accuracy && enhancedLocation.accuracy <= (options.minAccuracy || 50)) {
      return enhancedLocation;
    }
  } catch (error) {
    console.log('GPS positioning failed, trying fallback methods...');
  }

  // Method 2: Try standard accuracy if high accuracy failed
  if (options.enableHighAccuracy) {
    try {
      const standardOptions = { ...options, enableHighAccuracy: false };
      const standardPosition = await getPositionWithRetry(standardOptions);
      const enhancedLocation: EnhancedLocation = {
        lat: standardPosition.coords.latitude,
        lng: standardPosition.coords.longitude,
        accuracy: standardPosition.coords.accuracy || undefined,
        timestamp: Date.now(),
        method: 'gps',
      };
      
      locationHistory.push(enhancedLocation);
    } catch (error) {
      console.log('Standard GPS positioning also failed...');
    }
  }

  // Method 3: IP-based geolocation as last resort
  const ipLocation = await getIPBasedLocation();
  if (ipLocation) {
    locationHistory.push(ipLocation);
  }

  // Return the best available location
  if (locationHistory.length > 0) {
    const avgPosition = calculateAveragePosition(locationHistory);
    return {
      lat: avgPosition.lat,
      lng: avgPosition.lng,
      accuracy: avgPosition.accuracy,
      timestamp: Date.now(),
      method: locationHistory[0].method, // Use the method of the first (best) location
    };
  }

  throw new Error('All location methods failed');
};

// Start continuous location monitoring
export const startLocationMonitoring = (
  onLocationUpdate: (location: EnhancedLocation) => void,
  options: GeolocationOptions = GEOLOCATION_OPTIONS.HIGH_PRECISION
): (() => void) => {
  let watchId: number | null = null;
  const locationHistory: EnhancedLocation[] = [];

  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const enhancedLocation: EnhancedLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          timestamp: Date.now(),
          method: 'gps',
        };

        locationHistory.push(enhancedLocation);

        // Keep only recent readings (last 30 seconds)
        const thirtySecondsAgo = Date.now() - 30000;
        const recentLocations = locationHistory.filter(
          loc => loc.timestamp > thirtySecondsAgo
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
            timestamp: Date.now(),
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
