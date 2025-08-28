import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, RotateCcw, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';

interface FreeWaypointNavigationProps {
  destination: string;
  onClose: () => void;
  isOpen: boolean;
}

interface NavigationStep {
  instruction: string;
  distance: string;
  maneuver: 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'u-turn' | 'arrive';
}

interface RouteResponse {
  routes: Array<{
    legs: Array<{
      steps: Array<{
        maneuver: {
          instruction: string;
          type: string;
        };
        distance: number;
        duration: number;
      }>;
      distance: number;
      duration: number;
    }>;
  }>;
}

export function FreeWaypointNavigation({ destination, onClose, isOpen }: FreeWaypointNavigationProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<NavigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [distanceToDestination, setDistanceToDestination] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  // Ensure Leaflet CSS is loaded
  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }, []);

  // Get current location
  useEffect(() => {
    if (isOpen && !currentLocation) {
      getCurrentLocation();
    }
  }, [isOpen, currentLocation]);

  // Initialize map when component opens
  useEffect(() => {
    if (isOpen && mapRef.current && !mapInstance.current) {
      initializeMap();
    }
  }, [isOpen]);

  // Calculate route when both locations are available
  useEffect(() => {
    if (currentLocation && destinationCoords && isOpen) {
      calculateRoute();
    }
  }, [currentLocation, destinationCoords, isOpen]);

  // Cleanup map when component closes
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

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
    if (!mapRef.current) return;

    try {
      // Create map instance
      mapInstance.current = L.map(mapRef.current, {
        zoom: 13,
        center: [14.5995, 120.9842], // Default to Manila, Philippines
        zoomControl: true,
        attributionControl: true,
        minZoom: 3,
        maxZoom: 18,
        zoomControlPosition: 'bottomright',
      });

      // Add OpenStreetMap tiles with better styling
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);

      // Create layers for route and markers
      routeLayer.current = L.layerGroup().addTo(mapInstance.current);
      markersLayer.current = L.layerGroup().addTo(mapInstance.current);

      // Add a loading indicator to the map
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.9);
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          text-align: center;
          z-index: 1000;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
          "></div>
          <div style="color: #374151; font-weight: 500;">Loading map...</div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      mapRef.current.appendChild(loadingDiv);

      // Remove loading indicator after map is ready
      mapInstance.current.whenReady(() => {
        if (loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map. Please try again.');
    }
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Use OpenStreetMap Nominatim geocoding service (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const calculateRoute = async () => {
    if (!currentLocation || !mapInstance.current || !routeLayer.current || !markersLayer.current) return;

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

      // Use OSRM routing service (free)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${destCoords.lng},${destCoords.lat}?overview=full&steps=true&annotations=true`;
      
      const response = await fetch(osrmUrl);
      if (!response.ok) {
        throw new Error('Routing service unavailable');
      }

      const routeData: RouteResponse = await response.json();
      
      if (routeData.routes && routeData.routes.length > 0) {
        const route = routeData.routes[0];
        const leg = route.legs[0];
        
        // Convert distance and duration
        const distanceKm = (leg.distance / 1000).toFixed(1);
        const durationMinutes = Math.round(leg.duration / 60);
        
        setDistanceToDestination(`${distanceKm} km`);
        setEstimatedTime(`${durationMinutes} min`);

        // Parse steps for turn-by-turn navigation
        const steps: NavigationStep[] = leg.steps.map((step) => ({
          instruction: step.maneuver.instruction,
          distance: `${(step.distance / 1000).toFixed(1)} km`,
          maneuver: getManeuverType(step.maneuver.type),
        }));
        
        setRoute(steps);
        setCurrentStep(0);

        // Draw route on map
        drawRouteOnMap(route);
        
        // Add markers
        addMarkersToMap();
        
        // Fit map to route bounds
        fitMapToRoute();
      } else {
        setError('Could not calculate route. Please check the destination address.');
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setError('Failed to calculate route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const drawRouteOnMap = (routeData: any) => {
    if (!routeLayer.current || !mapInstance.current) return;

    // Clear existing route
    routeLayer.current.clearLayers();

    try {
      // Decode polyline from OSRM response
      const coordinates = routeData.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
      
      // Create polyline with GTA V-style styling
      const routeLine = L.polyline(coordinates, {
        color: '#3B82F6',
        weight: 8,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '10, 5',
        dashOffset: '0',
      });

      // Add a shadow effect for better visibility
      const shadowLine = L.polyline(coordinates, {
        color: '#1e40af',
        weight: 12,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round',
      });

      routeLayer.current.addLayer(shadowLine);
      routeLayer.current.addLayer(routeLine);

      // Add animated route progress
      const progressLine = L.polyline(coordinates, {
        color: '#ffffff',
        weight: 4,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      });

      routeLayer.current.addLayer(progressLine);

      // Animate the progress line
      let progress = 0;
      const animateProgress = () => {
        progress += 0.02;
        if (progress <= 1) {
          const currentCoords = coordinates.slice(0, Math.floor(coordinates.length * progress));
          progressLine.setLatLngs(currentCoords);
          requestAnimationFrame(animateProgress);
        }
      };
      animateProgress();

    } catch (error) {
      console.error('Error drawing route:', error);
    }
  };

  const addMarkersToMap = () => {
    if (!markersLayer.current || !currentLocation || !destinationCoords) return;

    // Clear existing markers
    markersLayer.current.clearLayers();

    // Add current location marker with pulsing effect
    const currentMarker = L.marker([currentLocation.lat, currentLocation.lng], {
      icon: L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            position: relative;
            width: 24px;
            height: 24px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 24px;
              height: 24px;
              background-color: #10B981;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
              animation: pulse 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 6px;
              left: 6px;
              width: 12px;
              height: 12px;
              background-color: #ffffff;
              border-radius: 50%;
            "></div>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.7; }
              100% { transform: scale(1); opacity: 1; }
            }
          </style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).addTo(markersLayer.current);

    // Add destination marker with target effect
    const destMarker = L.marker([destinationCoords.lat, destinationCoords.lng], {
      icon: L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            position: relative;
            width: 28px;
            height: 28px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 28px;
              height: 28px;
              background-color: #EF4444;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
              animation: target 1.5s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 4px;
              left: 4px;
              width: 20px;
              height: 20px;
              background-color: #ffffff;
              border-radius: 50%;
            "></div>
            <div style="
              position: absolute;
              top: 8px;
              left: 8px;
              width: 12px;
              height: 12px;
              background-color: #EF4444;
              border-radius: 50%;
            "></div>
          </div>
          <style>
            @keyframes target {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          </style>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).addTo(markersLayer.current);

    // Add enhanced popups
    currentMarker.bindPopup(`
      <div style="text-align: center; padding: 8px;">
        <div style="font-weight: 600; color: #10B981; margin-bottom: 4px;">📍 Your Location</div>
        <div style="font-size: 12px; color: #6B7280;">GPS coordinates captured</div>
      </div>
    `, {
      className: 'custom-popup',
      maxWidth: 200,
    }).openPopup();

    destMarker.bindPopup(`
      <div style="text-align: center; padding: 8px;">
        <div style="font-weight: 600; color: #EF4444; margin-bottom: 4px;">🎯 Destination</div>
        <div style="font-size: 12px; color: #6B7280;">${destination}</div>
      </div>
    `, {
      className: 'custom-popup',
      maxWidth: 200,
    });
  };

  const fitMapToRoute = () => {
    if (!mapInstance.current || !currentLocation || !destinationCoords) return;

    const bounds = L.latLngBounds([
      [currentLocation.lat, currentLocation.lng],
      [destinationCoords.lat, destinationCoords.lng]
    ]);

    mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const getManeuverType = (maneuver: string): NavigationStep['maneuver'] => {
    switch (maneuver) {
      case 'turn-left': return 'turn-left';
      case 'turn-right': return 'turn-right';
      case 'slight-left': return 'slight-left';
      case 'slight-right': return 'slight-right';
      case 'u-turn': return 'u-turn';
      case 'arrive': return 'arrive';
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
      case 'arrive': return <MapPin className="w-5 h-5" />;
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
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Navigation className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Free Waypoint Navigation
            </h2>
            <p className="text-sm text-gray-600 mt-1">🚗 GTA V-style GPS navigation using OpenStreetMap</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-3 rounded-xl hover:bg-white hover:shadow-md text-gray-500 transition-all duration-200"
            title={isFullScreen ? "Exit full screen" : "Enter full screen"}
          >
            {isFullScreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
          <button
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-white hover:shadow-md text-gray-500 transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 flex overflow-hidden h-[calc(100vh-120px)] ${isFullScreen ? 'flex-col' : 'flex-col lg:flex-row'}`}>
        {/* Map */}
        <div className={`relative ${isFullScreen ? 'h-2/3' : 'flex-1'}`}>
          <div ref={mapRef} className="w-full h-full" />
          {/* Map overlay info */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-200">
            <div className="text-xs text-gray-600 font-medium">🗺️ OpenStreetMap</div>
            <div className="text-xs text-gray-500">Powered by Leaflet</div>
          </div>
          {/* Full-screen indicator */}
          {isFullScreen && (
            <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
              🖥️ Full Screen
            </div>
          )}
        </div>

        {/* Navigation Panel */}
        <div className={`bg-gradient-to-br from-gray-50 to-blue-50 p-6 overflow-y-auto border-l border-gray-200 ${isFullScreen ? 'w-full h-1/3 border-t border-gray-200' : 'w-full lg:w-[450px]'}`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-32 space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
              </div>
              <div className="text-center">
                <div className="text-gray-700 font-medium">Calculating route...</div>
                <div className="text-sm text-gray-500">Getting your location and finding the best path</div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-red-600 mb-4 font-medium">{error}</div>
              <button
                onClick={getCurrentLocation}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🔄 Try Again
              </button>
            </div>
          ) : route.length > 0 ? (
            <div className="space-y-6">
              {/* Current Step */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    {getManeuverIcon(route[currentStep].maneuver)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg leading-tight">
                      {route[currentStep].instruction}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      📏 {route[currentStep].distance}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">
                    Step {currentStep + 1} of {route.length}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    🎯 Next turn
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={previousStep}
                    disabled={currentStep === 0}
                    className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {distanceToDestination}
                    </div>
                    <div className="text-sm text-gray-600">⏱️ ETA: {estimatedTime}</div>
                  </div>
                  <button
                    onClick={nextStep}
                    disabled={currentStep === route.length - 1}
                    className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ArrowRight className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / route.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Route Steps */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">🗺️ Full Route</h3>
                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                    {route.length} steps
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {route.map((step, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        index === currentStep
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md scale-105'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setCurrentStep(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          index === currentStep 
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getManeuverIcon(step.maneuver)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {step.instruction}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <span>📏</span>
                            <span>{step.distance}</span>
                          </div>
                        </div>
                        {index === currentStep && (
                          <div className="text-blue-600 text-xs font-medium bg-blue-100 px-2 py-1 rounded-full">
                            Current
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(destination)}`, '_blank')}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  🌐 Open in OpenStreetMap
                </button>
                <button
                  onClick={getCurrentLocation}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                >
                  <RefreshCw className="w-5 h-5 inline mr-2" />
                  🔄 Refresh Location
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
  );
}

