// Geocoding utility for converting addresses to coordinates
// Uses OpenStreetMap Nominatim service (free, no API key required)

// In-memory cache for geocoding results
const geocodeCache = new Map<string, { lat: number; lng: number }>();

/**
 * Geocode an address to get latitude and longitude coordinates
 * @param address - The address string to geocode
 * @returns Promise with coordinates or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return null;
  }

  const trimmedAddress = address.trim();
  
  // Check cache first
  const cached = geocodeCache.get(trimmedAddress);
  if (cached) {
    return cached;
  }

  try {
    // Use OpenStreetMap Nominatim geocoding service (free, public)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedAddress)}&addressdetails=0&limit=1`;
    const response = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Bantay-SP-App/1.0' // Nominatim requires a user agent
      }
    });

    if (!response.ok) {
      console.warn(`Geocoding failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0 && data[0]?.lat && data[0]?.lon) {
      const coords = { 
        lat: parseFloat(data[0].lat), 
        lng: parseFloat(data[0].lon) 
      };
      
      // Cache the result
      geocodeCache.set(trimmedAddress, coords);
      
      return coords;
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Check if coordinates are valid (not null, not zero, and within valid ranges)
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns true if coordinates are valid
 */
export function isValidCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  
  // Check for zero coordinates (often indicates missing data)
  if (lat === 0 && lng === 0) {
    return false;
  }
  
  // Check valid latitude range (-90 to 90)
  if (lat < -90 || lat > 90) {
    return false;
  }
  
  // Check valid longitude range (-180 to 180)
  if (lng < -180 || lng > 180) {
    return false;
  }
  
  return true;
}

/**
 * Get coordinates from a report, with geocoding fallback if needed
 * @param report - Report object with location data
 * @returns Promise with coordinates or null
 */
export async function getReportCoordinates(report: { 
  location_lat?: number | null; 
  location_lng?: number | null; 
  location_address?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  // First, check if we have valid coordinates
  if (isValidCoordinates(report.location_lat, report.location_lng)) {
    return {
      lat: report.location_lat!,
      lng: report.location_lng!
    };
  }
  
  // If no valid coordinates, try geocoding the address
  if (report.location_address) {
    const coords = await geocodeAddress(report.location_address);
    if (coords) {
      return coords;
    }
  }
  
  return null;
}

