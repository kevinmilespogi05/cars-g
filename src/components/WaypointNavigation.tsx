import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, RotateCcw, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';

interface WaypointNavigationProps {
  destination: string;
  onClose: () => void;
  isOpen: boolean;
}

interface NavigationStep {
  instruction: string;
  distance: string;
  maneuver: 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'u-turn';
}

export function WaypointNavigation({ destination, onClose, isOpen }: WaypointNavigationProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<NavigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [distanceToDestination, setDistanceToDestination] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);

  // Get current location
  useEffect(() => {
    if (isOpen && !currentLocation) {
      getCurrentLocation();
    }
  }, [isOpen, currentLocation]);

  // Initialize Google Maps
  useEffect(() => {
    if (isOpen && mapRef.current && !mapInstance.current) {
      initializeMap();
    }
  }, [isOpen]);

  // Load Google Maps API
  useEffect(() => {
    if (isOpen && !window.google) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError('Google Maps API key is not configured.');
        return;
      }

      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places']
      });

      loader.load()
        .then(() => {
          if (mapRef.current && !mapInstance.current) {
            initializeMap();
          }
        })
        .catch((error) => {
          console.error('Failed to load Google Maps:', error);
          setError('Failed to load Google Maps. Please try again.');
        });
    }
  }, [isOpen]);

  // Calculate route when both locations are available
  useEffect(() => {
    if (currentLocation && destinationCoords && isOpen) {
      calculateRoute();
    }
  }, [currentLocation, destinationCoords, isOpen]);

  const getCurrentLocation = () => {
    setIsLoading(true);
    setError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          setIsLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your current location. Please enable location services.');
          setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setIsLoading(false);
    }
  };

  const initializeMap = () => {
    if (!window.google || !mapRef.current) return;

    try {
      directionsService.current = new window.google.maps.DirectionsService();
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#3B82F6',
          strokeWeight: 6,
          strokeOpacity: 0.8,
        },
      });

      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat: 0, lng: 0 },
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      directionsRenderer.current.setMap(mapInstance.current);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map. Please try again.');
    }
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!window.google) return null;

    const geocoder = new window.google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({ lat: location.lat(), lng: location.lng() });
        } else {
          resolve(null);
        }
      });
    });
  };

  const calculateRoute = async () => {
    if (!currentLocation || !directionsService.current || !directionsRenderer.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, geocode the destination address
      const destCoords = await geocodeAddress(destination);
      if (!destCoords) {
        setError('Could not find the destination address. Please check the address and try again.');
        setIsLoading(false);
        return;
      }
      setDestinationCoords(destCoords);

      const request: google.maps.DirectionsRequest = {
        origin: currentLocation,
        destination: destCoords,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      };

      directionsService.current.route(request, (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.current?.setDirections(result);
          
          const route = result.routes[0];
          if (route) {
            const leg = route.legs[0];
            setDistanceToDestination(leg.distance?.text || '');
            setEstimatedTime(leg.duration?.text || '');

            // Parse steps for turn-by-turn navigation
            const steps: NavigationStep[] = leg.steps.map((step) => ({
              instruction: step.instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
              distance: step.distance?.text || '',
              maneuver: getManeuverType(step.maneuver || ''),
            }));
            setRoute(steps);
            setCurrentStep(0);
          }
        } else {
          setError('Could not calculate route. Please check the destination address.');
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error calculating route:', error);
      setError('Failed to calculate route. Please try again.');
      setIsLoading(false);
    }
  };

  const getManeuverType = (maneuver: string): NavigationStep['maneuver'] => {
    switch (maneuver) {
      case 'turn-left': return 'turn-left';
      case 'turn-right': return 'turn-right';
      case 'slight-left': return 'slight-left';
      case 'slight-right': return 'slight-right';
      case 'u-turn': return 'u-turn';
      default: return 'straight';
    }
  };

  const getManeuverIcon = (maneuver: NavigationStep['maneuver']) => {
    switch (maneuver) {
      case 'turn-left': return <ArrowLeft className="w-5 h-5" />;
      case 'turn-right': return <ArrowRight className="w-5 h-5" />;
      case 'slight-left': return <ArrowLeft className="w-4 h-4" />;
      case 'slight-right': return <ArrowRight className="w-4 h-4" />;
      case 'u-turn': return <RotateCcw className="w-5 h-5" />;
      default: return <ArrowUp className="w-5 h-5" />;
    }
  };

  const nextStep = () => {
    if (currentStep < route.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Waypoint Navigation</h2>
              <p className="text-sm text-gray-600">GPS-style navigation to destination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Map */}
          <div className="flex-1 min-h-[300px] lg:min-h-0">
            <div ref={mapRef} className="w-full h-full rounded-lg" />
          </div>

          {/* Navigation Panel */}
          <div className="w-full lg:w-96 bg-gray-50 p-6 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <button
                  onClick={getCurrentLocation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : route.length > 0 ? (
              <div className="space-y-6">
                {/* Current Step */}
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      {getManeuverIcon(route[currentStep].maneuver)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {route[currentStep].instruction}
                      </div>
                      <div className="text-sm text-gray-500">
                        {route[currentStep].distance}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Step {currentStep + 1} of {route.length}
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={previousStep}
                    disabled={currentStep === 0}
                    className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{distanceToDestination}</div>
                    <div className="text-sm text-gray-500">ETA: {estimatedTime}</div>
                  </div>
                  <button
                    onClick={nextStep}
                    disabled={currentStep === route.length - 1}
                    className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Route Steps */}
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Full Route</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {route.map((step, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          index === currentStep
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setCurrentStep(index)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
                            {getManeuverIcon(step.maneuver)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {step.instruction}
                            </div>
                            <div className="text-xs text-gray-500">
                              {step.distance}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank')}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Open in Google Maps
                  </button>
                  <button
                    onClick={getCurrentLocation}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Refresh Location
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Calculating route...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
