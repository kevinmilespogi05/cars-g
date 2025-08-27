import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  MapPin, 
  AlertTriangle, 
  Check, 
  X, 
  Eye, 
  Clock,
  Filter,
  Search,
  Bell,
  Settings,
  RefreshCw,
  Layers,
  ZoomIn,
  ZoomOut,
  Wrench
} from 'lucide-react';
import { Notification } from './Notification';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  location: {
    lat: number;
    lng: number;
  };
  location_address: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  images: string[];
}

interface MapMarker {
  id: string;
  position: [number, number];
  report: Report;
  isNew: boolean;
  isCluster?: boolean;
  clusterReports?: Report[];
}

export function AdminMapDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<'all' | Report['status']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.8386, 120.1881]); // Default to Castillejos, Zambales, Philippines
  const [zoom, setZoom] = useState(14);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const isInitializing = useRef(false);
  // Cache for address → coordinates to avoid repeated geocoding calls
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  // Background geocoding queue to avoid blocking initial render
  const geocodeQueueRef = useRef<Array<{ id: string; address: string }>>([]);
  const geocodeProcessingRef = useRef(false);
  const fetchAbortRef = useRef<AbortController | null>(null);
  // Track created Leaflet markers by report id for quick access
  const markerRefs = useRef<Map<string, any>>(new Map());
  const updateTimerRef = useRef<any>(null);
  const didFitBoundsRef = useRef(false);
  const [showMobileList, setShowMobileList] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportForModal, setSelectedReportForModal] = useState<Report | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [clusterReports, setClusterReports] = useState<Report[]>([]);
  const [clusterPosition, setClusterPosition] = useState<[number, number]>([0, 0]);

  // Keyboard navigation for image modal
  useEffect(() => {
    if (!showImageModal || !selectedReportForModal?.images) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowImageModal(false);
        setSelectedImage(null);
      } else if (event.key === 'ArrowLeft') {
        const currentIndex = selectedReportForModal.images.indexOf(selectedImage!);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : selectedReportForModal.images.length - 1;
        setSelectedImage(selectedReportForModal.images[prevIndex]);
      } else if (event.key === 'ArrowRight') {
        const currentIndex = selectedReportForModal.images.indexOf(selectedImage!);
        const nextIndex = currentIndex < selectedReportForModal.images.length - 1 ? currentIndex + 1 : 0;
        setSelectedImage(selectedReportForModal.images[nextIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal, selectedImage, selectedReportForModal]);

  // Group reports by location to handle overlapping markers
  const groupReportsByLocation = (reports: Report[]): { [key: string]: Report[] } => {
    const groups: { [key: string]: Report[] } = {};
    const CLUSTER_THRESHOLD = 0.0001; // Very small distance for clustering (about 10 meters)
    
    reports.forEach(report => {
      if (!report.location?.lat || !report.location?.lng) return;
      
      // Find if this report should be grouped with existing ones
      let grouped = false;
      for (const key in groups) {
        const [lat, lng] = key.split(',').map(Number);
        const distance = Math.sqrt(
          Math.pow(report.location.lat - lat, 2) + 
          Math.pow(report.location.lng - lng, 2)
        );
        
        if (distance < CLUSTER_THRESHOLD) {
          groups[key].push(report);
          grouped = true;
          break;
        }
      }
      
      // If not grouped, create new group
      if (!grouped) {
        const key = `${report.location.lat},${report.location.lng}`;
        groups[key] = [report];
      }
    });
    
    return groups;
  };

  // Treat a coordinate as invalid if missing, zero, or the common wrong default reused across reports
  const isInvalidLocation = (loc?: { lat: number; lng: number } | null): boolean => {
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return true;
    if (loc.lat === 0 || loc.lng === 0) return true;
    // Heuristic: avoid the shared Castillejos default for diverse addresses
    const isCastillejosDefault = Math.abs(loc.lat - 14.8386) < 0.0005 && Math.abs(loc.lng - 120.1881) < 0.0005;
    return isCastillejosDefault;
  };

  // Geocode an address using Nominatim (OpenStreetMap). Lightweight and public; cached in-memory.
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const cached = geocodeCacheRef.current.get(address);
      if (cached) return cached;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=0&limit=1`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0 && json[0]?.lat && json[0]?.lon) {
        const coords = { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
        geocodeCacheRef.current.set(address, coords);
        return coords;
      }
      return null;
    } catch {
      return null;
    }
  };

  const enqueueGeocode = (id: string, address: string) => {
    if (!address) return;
    // Avoid duplicates
    if (geocodeQueueRef.current.find(item => item.id === id)) return;
    geocodeQueueRef.current.push({ id, address });
    processGeocodeQueue();
  };

  const processGeocodeQueue = async () => {
    if (geocodeProcessingRef.current) return;
    geocodeProcessingRef.current = true;
    try {
      while (geocodeQueueRef.current.length > 0) {
        const next = geocodeQueueRef.current.shift()!;
        const coords = await geocodeAddress(next.address);
        if (coords) {
          setReports(prev => prev.map(r => r.id === next.id ? { ...r, location: coords } as any : r));
          // Update marker position if exists
          const marker = markerRefs.current.get(next.id);
          if (marker && marker.setLatLng) {
            marker.setLatLng([coords.lat, coords.lng]);
          }
        }
        // Small delay to be polite to Nominatim and keep UI responsive
        await new Promise(r => setTimeout(r, 150));
      }
    } finally {
      geocodeProcessingRef.current = false;
    }
  };

  const focusReportOnMap = async (report: Report) => {
    try {
      if (!mapInstance.current) return;
      let target = report.location;
      if (isInvalidLocation(target) && report.location_address) {
        const geo = await geocodeAddress(report.location_address);
        if (geo) target = geo;
      }
      if (isInvalidLocation(target)) return;
      // Pan/zoom to the report
      mapInstance.current.setView([target.lat, target.lng], Math.max(16, mapInstance.current.getZoom() || 14), {
        animate: true,
        duration: 0.8
      });
      // Optionally bounce/highlight the marker if it exists
      const marker = markerRefs.current.get(report.id);
      if (marker && marker.openPopup) {
        // Do not open popup here, only highlight by briefly adding/removing a CSS class
        const el = marker.getElement && marker.getElement();
        if (el) {
          el.classList.add('ring-4', 'ring-yellow-300');
          setTimeout(() => el.classList.remove('ring-4', 'ring-yellow-300'), 1200);
        }
      }
    } catch (e) {
      console.log('Error focusing report on map', e);
    }
  };

  // Check if user has admin privileges
  useEffect(() => {
    if (user && user.role !== 'admin') {
      showNotification('Admin privileges required to access this dashboard', 'error');
    }
  }, [user]);

  useEffect(() => {
    console.log('useEffect triggered - realTimeEnabled:', realTimeEnabled);
    fetchReports();
    
    if (realTimeEnabled) {
      setupRealTimeSubscription();
    }

    return () => {
      if (realTimeEnabled) {
        cleanupRealTimeSubscription();
      }
    };
  }, [realTimeEnabled]); // Remove mapInitialized from dependencies to prevent re-initialization

  // Separate effect for map initialization to avoid conflicts
  useEffect(() => {
    if (!mapInstance.current && !mapInitialized && !isInitializing.current) {
      console.log('Map initialization effect triggered');
      initializeMap();
    }
  }, []); // Only run once on mount

  useEffect(() => {
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      updateMapMarkers();
    }, 100);
  }, [reports, filter, searchTerm]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (error) {
          console.log('Map already removed or not initialized');
        }
        mapInstance.current = null;
        markersLayer.current = null;
        setMapInitialized(false);
      }
    };
  }, []);

  // Monitor map state consistency
  useEffect(() => {
    if (mapInitialized && !mapInstance.current) {
      console.log('Map state inconsistent, resetting...');
      setMapInitialized(false);
      setMapError('Map state inconsistent. Please refresh.');
    }
  }, [mapInitialized, mapInstance.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isInitializing.current = true; // Prevent new initializations
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const resetMap = () => {
    console.log('resetMap called');
    if (mapInstance.current) {
      try {
        mapInstance.current.remove();
      } catch (error) {
        console.log('Error removing map:', error);
      }
      mapInstance.current = null;
      markersLayer.current = null;
      setMapInitialized(false);
    }
    
    // Also clean up the DOM container
    if (mapRef.current) {
      try {
        mapRef.current.innerHTML = '';
        if (mapRef.current._leaflet_id) {
          delete mapRef.current._leaflet_id;
        }
        // Clear our custom map ID
        if (mapRef.current.dataset.mapId) {
          delete mapRef.current.dataset.mapId;
        }
      } catch (error) {
        console.log('Error cleaning up DOM container:', error);
      }
    }
    
    setMapError(null);
    isInitializing.current = false;
  };

  const refreshMap = () => {
    console.log('Refreshing map...');
    resetMap();
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      initializeMap();
    }, 100);
  };

  const initializeMap = async () => {
    try {
      console.log('initializeMap called - mapInstance.current:', !!mapInstance.current, 'mapInitialized:', mapInitialized);
      
      // Prevent multiple initializations
      if (mapInstance.current || mapInitialized || isInitializing.current) {
        console.log('Map already initialized or initializing, skipping...');
        return;
      }
      
      isInitializing.current = true;
      
      // Check if map container exists
      if (!mapRef.current) {
        console.log('Map container not ready');
        return;
      }

      // Add Leaflet CSS on demand (helps cold-start)
      const existingCss = document.querySelector('link[data-leaflet]');
      if (!existingCss) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet', 'true');
        document.head.appendChild(link);
      }

      // Add a unique identifier to prevent reuse
      if (!mapRef.current.dataset.mapId) {
        mapRef.current.dataset.mapId = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('Assigned map ID:', mapRef.current.dataset.mapId);
      }

      // Dynamically import Leaflet to avoid SSR issues
      const L = await import('leaflet');
      
      // Check if container is still valid and has our map ID
      if (!mapRef.current || !mapRef.current.dataset.mapId) {
        console.log('Map container no longer available or missing map ID');
        return;
      }

      // Check if the container already has a map instance or Leaflet elements
      if (mapRef.current._leaflet_id || mapRef.current.querySelector('.leaflet-container') || mapRef.current.querySelector('.leaflet-map-pane')) {
        console.log('Container already has Leaflet elements, cleaning up...');
        try {
          // Clear the container completely
          mapRef.current.innerHTML = '';
          // Remove any Leaflet references
          if (mapRef.current._leaflet_id) {
            delete mapRef.current._leaflet_id;
          }
          // Also check for any other Leaflet-related attributes
          const leafletAttrs = ['data-leaflet-id', 'data-leaflet-layer-id'];
          leafletAttrs.forEach(attr => {
            if (mapRef.current.hasAttribute(attr)) {
              mapRef.current.removeAttribute(attr);
            }
          });
        } catch (cleanupError) {
          console.log('Error cleaning up existing map from container:', cleanupError);
        }
        
        // Small delay to ensure DOM cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Final safety check - ensure container is completely clean
      if (mapRef.current.children.length > 0) {
        console.log('Container still has children after cleanup, forcing clear...');
        mapRef.current.innerHTML = '';
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      // Initialize map
      mapInstance.current = L.map(mapRef.current, { preferCanvas: true }).setView(mapCenter, zoom);

      // Use a fast raster tile source
      const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      L.tileLayer(tileUrl, {
        attribution: '© OpenStreetMap contributors',
        crossOrigin: true,
        updateWhenZooming: false,
        keepBuffer: 2
      }).addTo(mapInstance.current);

      // Create markers layer
      markersLayer.current = L.layerGroup().addTo(mapInstance.current);

      // Add map controls
      const zoomControl = L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

      // Add custom controls
      await addCustomControls();

      // Handle map events
      mapInstance.current.on('moveend', () => {
        if (mapInstance.current) {
          const center = mapInstance.current.getCenter();
          setMapCenter([center.lat, center.lng]);
        }
      });

      mapInstance.current.on('zoomend', () => {
        if (mapInstance.current) {
          setZoom(mapInstance.current.getZoom());
        }
      });

      setMapInitialized(true);
      setMapError(null);
      isInitializing.current = false;
      console.log('Map initialized successfully');

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map. Please try refreshing.');
      showNotification('Failed to initialize map. Please refresh the page.', 'error');
      isInitializing.current = false;
    }
  };

  const addCustomControls = async () => {
    if (!mapInstance.current) return;

    try {
      const L = await import('leaflet');
      
      // Check if map instance is still valid and has required methods
      if (!mapInstance.current || 
          typeof mapInstance.current.getContainer !== 'function' ||
          typeof mapInstance.current.addTo !== 'function') {
        console.log('Map instance not ready for custom controls');
        return;
      }
      
      // Real-time toggle control
      const realTimeControl = L.Control.extend({
        options: {
          position: 'topright'
        },
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          // Safely access realTimeEnabled state with fallback
          const isRealTimeEnabled = typeof realTimeEnabled === 'boolean' ? realTimeEnabled : true;
          container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-2 m-2">
              <div class="flex items-center space-x-2">
                <input type="checkbox" id="realTimeToggle" ${isRealTimeEnabled ? 'checked' : ''} 
                       class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                <label for="realTimeToggle" class="text-sm font-medium text-gray-700">Real-Time</label>
              </div>
            </div>
          `;
          
          const toggle = container.querySelector('#realTimeToggle') as HTMLInputElement;
          if (toggle) {
            toggle.addEventListener('change', (e) => {
              const target = e.target as HTMLInputElement;
              setRealTimeEnabled(target.checked);
            });
          }
          
          return container;
        }
      });

      realTimeControl().addTo(mapInstance.current);
    } catch (error) {
      console.error('Error adding custom controls:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Show cached reports immediately to avoid perceived delay
      try {
        const cachedRaw = sessionStorage.getItem('admin_map_reports_v1');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached?.data) && cached.data.length > 0) {
            setReports(cached.data);
            setLoading(false);
          }
        }
      } catch {}

      // Cancel any in-flight fetch
      if (fetchAbortRef.current) {
        try { fetchAbortRef.current.abort(); } catch {}
      }
      fetchAbortRef.current = new AbortController();

      // Fetch only the latest 50 reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          id,
          title,
          description,
          category,
          status,
          priority,
          location,
          location_address,
          created_at,
          user_id,
          images
        `)
        .order('created_at', { ascending: false })
        .range(0, 49);

      if (reportsError) throw reportsError;

      // Try to get usernames for all user_ids from profiles table
      let userMap = new Map();
      const userIds = [...new Set((reportsData || []).map(report => report.user_id))];
      
      if (userIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);

          if (!profilesError && profilesData) {
            profilesData.forEach(profile => {
              userMap.set(profile.id, profile.username);
            });
          }
        } catch (error) {
          // Silently handle the case where profiles table doesn't exist
          console.log('Profiles table not found, using fallback usernames');
        }
      }

      // Fast formatting first; defer geocoding to background queue
      const formattedReports: Report[] = (reportsData || []).map((report) => {
        let location = report.location;
        if (isInvalidLocation(location)) {
          // Schedule background geocoding if address is present
          if (report.location_address) {
            enqueueGeocode(report.id, report.location_address);
          }
          // Use a light fallback so we can render markers immediately near town center
          location = { lat: 14.8386, lng: 120.1881 };
        }
        return {
          ...report,
          username: userMap.get(report.user_id) || `User ${report.user_id.slice(0, 8)}`,
          avatar_url: null,
          location
        } as Report;
      });

      // If no reports found, add some demo data for testing
      if (formattedReports.length === 0) {
        const demoReports: Report[] = [
          {
            id: 'demo-1',
            title: 'Blocked Drainage at West Avenue',
            description: 'After recent heavy rains, the drainage system along West Avenue near the elementary school has been clogged with debris and leaves. Water accumulates on the street, making it difficult for pedestrians and increasing the risk of flooding during the next storm.',
            category: 'public services',
            status: 'resolved',
            priority: 'medium',
            location: { lat: 14.8386, lng: 120.1881 },
            location_address: 'Del Pilar Street, San Roque, Castillejos, Zambales, Central Luzon, 2208, Philippines',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            user_id: 'demo-user-1',
            username: 'User demo-user-1',
            avatar_url: null,
            images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop']
          },
          {
            id: 'demo-2',
            title: 'Pothole on Santiago Road',
            description: 'A deep pothole has formed in the middle of Santiago Road near the public market, making it dangerous for vehicles and pedestrians.',
            category: 'Infrastructure',
            status: 'rejected',
            priority: 'medium',
            location: { lat: 14.8406, lng: 120.1901 },
            location_address: 'Santiago Road, San Roque, Castillejos, Zambales, Central Luzon, 2208, Philippines',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            user_id: 'demo-user-2',
            username: 'User demo-user-2',
            avatar_url: null,
            images: []
          },
          {
            id: 'demo-3',
            title: 'Overflowing Garbage Bins in Riverside Park',
            description: 'The garbage bins in Riverside Park have not been emptied for more than five days, causing an unpleasant smell and attracting stray animals.',
            category: 'environmental',
            status: 'in_progress',
            priority: 'high',
            location: { lat: 14.8386, lng: 120.1881 },
            location_address: 'Pamatawan Bridge, Zambales Highway, Cawag, Pamatawan, Subic, Zambales, Central Luzon, 2208, Philippines',
            created_at: new Date(Date.now() - 259200000).toISOString(),
            user_id: 'demo-user-3',
            username: 'User demo-user-3',
            avatar_url: null,
            images: []
          },
          {
            id: 'demo-4',
            title: 'Broken Street light',
            description: 'The streetlight on the corner of Main Avenue and Rivera Street has been out for over a week, making the area unsafe at night.',
            category: 'Utilities',
            status: 'rejected',
            priority: 'high',
            location: { lat: 14.8426, lng: 120.1921 },
            location_address: 'Main Avenue and Rivera Street, San Roque, Castillejos, Zambales, Central Luzon, 2208, Philippines',
            created_at: new Date(Date.now() - 345600000).toISOString(),
            user_id: 'demo-user-4',
            username: 'User demo-user-4',
            avatar_url: null,
            images: []
          }
        ];
        setReports(demoReports);
      } else {
        setReports(formattedReports);
        // Cache for next visit for instant paint
        try { sessionStorage.setItem('admin_map_reports_v1', JSON.stringify({ data: formattedReports, ts: Date.now() })); } catch {}
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      showNotification('Failed to fetch reports', 'error');
      
      // Fallback to demo data on error
      const demoReports: Report[] = [
        {
          id: 'demo-1',
          title: 'Blocked Drainage at West Avenue',
          description: 'After recent heavy rains, the drainage system along West Avenue near the elementary school has been clogged with debris and leaves. Water accumulates on the street, making it difficult for pedestrians and increasing the risk of flooding during the next storm.',
          category: 'public services',
          status: 'resolved',
          priority: 'medium',
          location: { lat: 14.8386, lng: 120.1881 },
          location_address: 'Del Pilar Street, San Roque, Castillejos, Zambales, Central Luzon, 2208, Philippines',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          user_id: 'demo-user-1',
          username: 'User demo-user-1',
          avatar_url: null,
          images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop']
        },
        {
          id: 'demo-3',
          title: 'Overflowing Garbage Bins in Riverside Park',
          description: 'The garbage bins in Riverside Park have not been emptied for more than five days, causing an unpleasant smell and attracting stray animals.',
          category: 'environmental',
          status: 'in_progress',
          priority: 'high',
          location: { lat: 14.8386, lng: 120.1881 },
          location_address: 'Pamatawan Bridge, Zambales Highway, Cawag, Pamatawan, Subic, Zambales, Central Luzon, 2208, Philippines',
          created_at: new Date(Date.now() - 259200000).toISOString(),
          user_id: 'demo-user-3',
          username: 'User demo-user-3',
          avatar_url: null,
          images: []
        }
      ];
      setReports(demoReports);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscription = () => {
    const subscription = supabase
      .channel('reports_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports'
        },
        (payload) => {
          console.log('New report received:', payload);
          handleNewReport(payload.new);
          // Update cache with the latest entry at the top
          try {
            const raw = sessionStorage.getItem('admin_map_reports_v1');
            const cached = raw ? JSON.parse(raw) : { data: [] };
            const next = [{ ...payload.new }, ...(cached.data || [])].slice(0, 50);
            sessionStorage.setItem('admin_map_reports_v1', JSON.stringify({ data: next, ts: Date.now() }));
          } catch {}
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports'
        },
        (payload) => {
          console.log('Report updated:', payload);
          handleReportUpdate(payload.new);
          // Sync cache entry quickly
          try {
            const raw = sessionStorage.getItem('admin_map_reports_v1');
            if (raw) {
              const cached = JSON.parse(raw);
              const next = (cached.data || []).map((r: any) => r.id === payload.new.id ? payload.new : r);
              sessionStorage.setItem('admin_map_reports_v1', JSON.stringify({ data: next, ts: Date.now() }));
            }
          } catch {}
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const cleanupRealTimeSubscription = () => {
    // This will be handled by the useEffect cleanup
  };

     const handleNewReport = async (newReport: any) => {
     // Show notification for new report
     showNotification(`New report: ${newReport.title}`, 'success');
     
           // Try to fetch the username for this user from profiles table
      let username = `User ${newReport.user_id?.slice(0, 8) || 'Unknown'}`;
      if (newReport.user_id) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newReport.user_id)
            .single();
          
          if (!profileError && profileData && profileData.username) {
            username = profileData.username;
          }
        } catch (error) {
          // Silently handle the case where profiles table doesn't exist
          console.log('Profiles table not found for new report, using fallback username');
        }
      }

     // Add new report to the list
     const formattedReport: Report = {
       ...newReport,
       username: username,
       avatar_url: null,
       location: newReport.location && newReport.location.lat && newReport.location.lng 
         ? newReport.location 
         : { lat: 14.8386, lng: 120.1881 } // Default to Castillejos if no valid coordinates
     };

     // If the location is invalid but we have an address, try to geocode it
     if (isInvalidLocation(formattedReport.location) && newReport.location_address) {
       const geo = await geocodeAddress(newReport.location_address);
       if (geo) {
         formattedReport.location = geo;
       } else if (isInvalidLocation(formattedReport.location)) {
         // Final fallback (approx Pamatawan area)
         formattedReport.location = { lat: 14.9002, lng: 120.1655 };
       }
     }

     setReports(prev => [formattedReport, ...prev]);
     
     // Add new marker with animation
     addNewMarker(formattedReport);
   };

  const handleReportUpdate = (updatedReport: any) => {
    setReports(prev => 
      prev.map(report => 
        report.id === updatedReport.id 
          ? { ...report, ...updatedReport }
          : report
      )
    );

    // Also update the map marker if the status changed
    if (updatedReport.status) {
      updateSpecificMarker(updatedReport.id, updatedReport.status);
    }
  };

  const addNewMarker = async (report: Report) => {
    if (!mapInstance.current || !markersLayer.current || !report.location?.lat || !report.location?.lng) return;

    try {
      const L = await import('leaflet');
      
      // Check if map and markers layer are still valid
      if (!mapInstance.current || !markersLayer.current || !mapInstance.current.getContainer) {
        console.log('Map or markers layer not ready for new marker');
        return;
      }
      
      // Create marker with new report styling
      const marker = L.marker([report.location.lat, report.location.lng], {
        icon: L.divIcon({
          className: 'new-report-marker',
          html: `
            <div class="relative">
              <div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });

      // Add popup
      marker.bindPopup(createMarkerPopup(report));
      // Wire up navigation when popup opens (use delegation and clean up on close)
      marker.on('popupopen', (e: any) => {
        try {
          const popupEl = e?.popup?.getElement?.() || marker.getPopup()?.getElement?.();
          if (!popupEl) return;
          const onClick = (ev: Event) => {
            const target = (ev.target as HTMLElement | null)?.closest?.('[data-view-details]');
            if (target) {
              ev.preventDefault();
              ev.stopPropagation();
              console.log('View full details clicked for report:', report.id);
              setSelectedReportForModal(report);
              setShowReportModal(true);
            }
          };
          popupEl.addEventListener('click', onClick);
          marker.once('popupclose', () => {
            try { popupEl.removeEventListener('click', onClick); } catch {}
          });
        } catch {}
      });

      // Add click event
      marker.on('click', () => {
        setSelectedReport(report);
        marker.openPopup();
      });

      // Add to map with animation
      marker.addTo(markersLayer.current);
      
      // Animate to new marker
      if (mapInstance.current && mapInstance.current.setView) {
        mapInstance.current.setView([report.location.lat, report.location.lng], 13, {
          animate: true,
          duration: 1
        });
      }
    } catch (error) {
      console.error('Error adding new marker:', error);
    }
  };

  const updateMapMarkers = async () => {
    if (!mapInstance.current || !markersLayer.current) return;

    try {
      const L = await import('leaflet');
      
      // Check if map and markers layer are still valid
      if (!mapInstance.current || !markersLayer.current || !mapInstance.current.getContainer) {
        console.log('Map or markers layer not ready');
        return;
      }
      
      // Clear existing markers
      markersLayer.current.clearLayers();
      markerRefs.current.clear();

      // Filter reports based on current filter and search
      const filteredReports = reports.filter(report => {
        const matchesFilter = filter === 'all' || report.status === filter;
        const matchesSearch = searchTerm === '' || 
          report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.username.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesFilter && matchesSearch;
      });

      // Group reports by location to handle overlapping markers
      const locationGroups = groupReportsByLocation(filteredReports);
      
      // Create markers for grouped reports
      const newMarkers: MapMarker[] = [];
      Object.entries(locationGroups).forEach(([locationKey, reports]) => {
        const [lat, lng] = locationKey.split(',').map(Number);
        
        if (reports.length === 1) {
          // Single report - create normal marker
          newMarkers.push({
            id: reports[0].id,
            position: [lat, lng],
            report: reports[0],
            isNew: false
          });
        } else {
          // Multiple reports - create cluster marker
          newMarkers.push({
            id: `cluster-${locationKey}`,
            position: [lat, lng],
            report: reports[0], // Use first report for display, but store all in a special way
            isNew: false,
            isCluster: true,
            clusterReports: reports
          } as any);
        }
      });

      setMapMarkers(newMarkers);

                    // Add markers to map
       newMarkers.forEach(markerData => {
         try {
           let marker;
           
           if (markerData.isCluster && markerData.clusterReports) {
             // Create cluster marker
             const clusterCount = markerData.clusterReports.length;
             marker = L.marker(markerData.position, {
               icon: L.divIcon({
                 className: 'report-marker cluster-marker',
                 html: `
                   <div class="relative group">
                     <div class="w-10 h-10 bg-purple-500 rounded-full border-3 border-white shadow-lg cursor-pointer flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform duration-200">
                       ${clusterCount}
                     </div>
                     <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-5 border-r-5 border-t-5 border-transparent border-t-purple-500"></div>
                     <div class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                       ${clusterCount} reports at this location
                     </div>
                   </div>
                 `,
                 iconSize: [40, 40],
                 iconAnchor: [20, 40]
               })
             });
           } else {
             // Create normal single report marker
             const markerColor = getMarkerColor(markerData.report.status, markerData.report.priority);
             const markerIcon = getMarkerIcon(markerData.report.status, markerData.report.priority);
             
             marker = L.marker(markerData.position, {
               icon: L.divIcon({
                 className: 'report-marker',
                 html: `
                   <div class="relative group">
                     <div class="w-8 h-8 ${markerColor} rounded-full border-3 border-white shadow-lg cursor-pointer flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform duration-200">
                       ${markerIcon}
                     </div>
                     <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-${markerColor.replace('bg-', '')}"></div>
                     <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                       ${markerData.report.title.substring(0, 20)}${markerData.report.title.length > 20 ? '...' : ''}
                     </div>
                   </div>
                 `,
                 iconSize: [32, 32],
                 iconAnchor: [16, 32]
               })
             });
           }

           // Add popup
           if (markerData.isCluster && markerData.clusterReports) {
             marker.bindPopup(createClusterPopup(markerData.clusterReports));
           } else {
             marker.bindPopup(createMarkerPopup(markerData.report));
           }
                        // Wire up navigation when popup opens (use delegation and clean up on close)
             marker.on('popupopen', (e: any) => {
               try {
                 const popupEl = e?.popup?.getElement?.() || marker.getPopup()?.getElement?.();
                 if (!popupEl) return;
                 
                 // Add click handler for the popup buttons
                 const onClick = (ev: Event) => {
                   const viewDetailsTarget = (ev.target as HTMLElement | null)?.closest?.('[data-view-details]');
                   const viewClusterTarget = (ev.target as HTMLElement | null)?.closest?.('[data-view-cluster]');
                   
                   if (viewDetailsTarget) {
                     ev.preventDefault();
                     ev.stopPropagation();
                     console.log('View full details clicked for report:', markerData.report.id);
                     
                     // Open modal instead of navigating
                     setSelectedReportForModal(markerData.report);
                     setShowReportModal(true);
                   } else if (viewClusterTarget && markerData.isCluster && markerData.clusterReports) {
                     ev.preventDefault();
                     ev.stopPropagation();
                     console.log('View cluster clicked for reports at location');
                     
                     // Open cluster modal
                     setClusterReports(markerData.clusterReports);
                     setClusterPosition(markerData.position);
                     setShowClusterModal(true);
                   }
                 };
                 
                 popupEl.addEventListener('click', onClick);
                 
                 // Clean up event listener when popup closes
                 marker.once('popupclose', () => {
                   try { 
                     popupEl.removeEventListener('click', onClick); 
                   } catch (error) {
                     console.log('Error removing event listener:', error);
                   }
                 });
               } catch (error) {
                 console.error('Error setting up popup click handler:', error);
               }
             });

           // Add click event
           marker.on('click', () => {
             setSelectedReport(markerData.report);
             marker.openPopup();
           });

           marker.addTo(markersLayer.current);
           // Track reference
           markerRefs.current.set(markerData.id, marker);
         } catch (markerError) {
           console.error('Error adding marker:', markerError);
         }
       });

       // Auto-fit map to show all markers if there are any
       if (!didFitBoundsRef.current && newMarkers.length > 0 && mapInstance.current) {
         try {
           const group = new L.featureGroup(newMarkers.map(m => L.marker(m.position)));
           mapInstance.current.fitBounds(group.getBounds().pad(0.1));
           didFitBoundsRef.current = true;
         } catch (error) {
           console.log('Error fitting bounds:', error);
         }
       }
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  };

  const getMarkerColor = (status: string, priority: string): string => {
    if (status === 'pending') return 'bg-yellow-500';
    if (status === 'in_progress') return 'bg-blue-500';
    if (status === 'resolved') return 'bg-green-500';
    if (status === 'rejected') return 'bg-red-500';
    
    // Fallback based on priority
    if (priority === 'high') return 'bg-red-500';
    if (priority === 'medium') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getMarkerIcon = (status: string, priority: string): string => {
    // Return appropriate icon based on status and priority
    if (status === 'pending') return '⏳';
    if (status === 'in_progress') return '🔧';
    if (status === 'resolved') return '✅';
    if (status === 'rejected') return '❌';
    
    // Fallback based on priority
    if (priority === 'high') return '🚨';
    if (priority === 'medium') return '⚠️';
    return '📍';
  };

  const createClusterPopup = (reports: Report[]): string => {
    const totalReports = reports.length;
    const statusCounts = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return `
      <div class="p-3 min-w-[280px] max-w-[350px]">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            ${totalReports}
          </div>
          <div class="flex-1">
            <div class="font-semibold text-gray-900 text-sm">Multiple Reports</div>
            <div class="text-xs text-gray-500">Same location</div>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="text-xs text-gray-600 mb-2"><strong>Status Summary:</strong></div>
          <div class="flex flex-wrap gap-1">
            ${Object.entries(statusCounts).map(([status, count]) => `
              <span class="px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}">
                ${status.replace('_', ' ')}: ${count}
              </span>
            `).join('')}
          </div>
        </div>
        
        <div class="text-xs text-gray-500 mb-3">
          <div><strong>Location:</strong> ${reports[0].location_address}</div>
          <div><strong>Total Reports:</strong> ${totalReports}</div>
        </div>
        
        <button data-view-cluster class="mt-2 w-full text-center text-sm text-purple-600 hover:text-purple-700 font-semibold border-t pt-2 cursor-pointer hover:bg-purple-50 rounded px-2 py-1 transition-colors">
          View all reports →
        </button>
      </div>
    `;
  };

  const createMarkerPopup = (report: Report): string => {
    const statusIcon = getMarkerIcon(report.status, report.priority);
    return `
      <div class="p-3 min-w-[250px] max-w-[300px]">
        <div class="flex items-start gap-2 mb-2">
          <span class="text-lg">${statusIcon}</span>
          <div class="flex-1">
            <div class="font-semibold text-gray-900 text-sm leading-tight">${report.title}</div>
            <div class="text-xs text-gray-500">${report.category}</div>
          </div>
        </div>
        <div class="text-sm text-gray-600 mb-3 leading-relaxed">${report.description.substring(0, 120)}${report.description.length > 120 ? '...' : ''}</div>
        <div class="flex items-center justify-between text-xs mb-2">
          <span class="px-2 py-1 rounded-full ${getStatusColor(report.status)} font-medium">${report.status.replace('_', ' ')}</span>
          <span class="px-2 py-1 rounded-full ${getPriorityColor(report.priority)} font-medium">${report.priority}</span>
        </div>
        <div class="text-xs text-gray-500 mb-2">
          <div><strong>Location:</strong> ${report.location_address}</div>
          <div><strong>Reporter:</strong> ${report.username}</div>
          <div><strong>Date:</strong> ${new Date(report.created_at).toLocaleDateString()}</div>
        </div>
        <button data-view-details data-report-id="${report.id}" class="mt-2 w-full text-center text-sm text-blue-600 hover:text-blue-700 font-semibold border-t pt-2 cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors">
          View full details →
        </button>
      </div>
    `;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateSpecificMarker = async (reportId: string, newStatus: Report['status']) => {
    console.log('updateSpecificMarker called:', reportId, newStatus);
    
    if (!mapInstance.current || !markersLayer.current) {
      console.log('Map or markers layer not ready');
      return;
    }

    try {
      const L = await import('leaflet');
      
      // Find the existing marker
      const existingMarker = markerRefs.current.get(reportId);
      if (!existingMarker) {
        console.log('Marker not found in refs:', reportId);
        return;
      }
      
      console.log('Found existing marker, updating...');

      // Find the report data
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      // Get new marker color and icon based on new status
      const markerColor = getMarkerColor(newStatus, report.priority);
      const markerIcon = getMarkerIcon(newStatus, report.priority);

      // Create new marker icon with updated status
      const newIcon = L.divIcon({
        className: 'report-marker',
        html: `
          <div class="relative group">
            <div class="w-8 h-8 ${markerColor} rounded-full border-3 border-white shadow-lg cursor-pointer flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform duration-200">
              ${markerIcon}
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-${markerColor.replace('bg-', '')}"></div>
            <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
              ${report.title.substring(0, 20)}${report.title.length > 20 ? '...' : ''}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      // Instead of recreating, let's try a different approach - force a complete map refresh
      console.log('Forcing map marker refresh...');
      
      // Remove the old marker
      existingMarker.remove();
      markerRefs.current.delete(reportId);
      
      // Force the map to refresh all markers
      setTimeout(() => {
        console.log('Refreshing map markers...');
        updateMapMarkers();
      }, 200);
      
      console.log('Marker refresh scheduled');

      // Note: Animation will be handled by the map refresh
      console.log('Animation will be handled by map refresh');

    } catch (error) {
      console.error('Error updating marker:', error);
    }
  };

  const handleReportAction = async (reportId: string, newStatus: Report['status']) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      const actionText = newStatus === 'in_progress' ? 'approved' : 
                        newStatus === 'resolved' ? 'resolved' : 
                        newStatus === 'rejected' ? 'rejected' : 
                        'updated';
      
      showNotification(`Report ${actionText} successfully`, 'success');
      
      // Update local state
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus }
            : report
        )
      );

      // Update the specific marker on the map to reflect the new status
      // Use a small delay to ensure state update is complete
      setTimeout(() => {
        updateSpecificMarker(reportId, newStatus);
      }, 100);

      // Close selected report if it was the one updated
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }

    } catch (error) {
      console.error(`Error updating report status:`, error);
      showNotification(`Failed to update report status`, 'error');
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesFilter = filter === 'all' || report.status === filter;
    const matchesSearch = searchTerm === '' || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Admin Map Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-600">Real-time monitoring of reports and locations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
            <button
              onClick={fetchReports}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={refreshMap}
              className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Refresh map if there are display issues"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Real-Time</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="realTimeToggle"
                    checked={realTimeEnabled}
                    onChange={(e) => setRealTimeEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="realTimeToggle" className="text-sm text-gray-700">
                    Enable real-time updates
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-112px)]">
        {/* Map */}
        <div className="flex-1 relative z-0">
          <div ref={mapRef} className="w-full h-full" />

          {/* Mobile tools */}
          <div className="md:hidden absolute bottom-4 right-4 flex items-center gap-2">
            <button
              onClick={() => mapInstance.current?.zoomIn()}
              className="p-2 bg-white rounded-full shadow-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => mapInstance.current?.zoomOut()}
              className="p-2 bg-white rounded-full shadow-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => setShowMobileList(true)}
              className="p-2 bg-white rounded-full shadow-lg"
              title="Open Reports"
            >
              <MapPin className="w-4 h-4 text-gray-700" />
            </button>
          </div>
          
          {/* Map Loading/Error State */}
          {!mapInstance.current && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                {mapError ? (
                  <>
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 mb-2">{mapError}</p>
                    <div className="space-x-2">
                      <button
                        onClick={refreshMap}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Refresh Map
                      </button>
                      <button
                        onClick={() => setMapError(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading map...</p>
                    <button
                      onClick={initializeMap}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Map Controls Overlay */}
          <div className="absolute top-4 left-4 space-y-2 z-10">
            <button
              onClick={() => mapInstance.current?.zoomIn()}
              className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => mapInstance.current?.zoomOut()}
              className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => {
                if (mapMarkers.length > 0 && mapInstance.current) {
                  try {
                    const L = require('leaflet');
                    const group = new L.featureGroup(mapMarkers.map(m => L.marker(m.position)));
                    mapInstance.current.fitBounds(group.getBounds().pad(0.1));
                  } catch (error) {
                    console.log('Error fitting bounds:', error);
                  }
                }
              }}
              className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white transition-colors"
              title="Show All Reports"
            >
              <MapPin className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Stats Overlay */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 md:p-4 min-w-[200px] z-[1001]">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Report Summary</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{reports.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending:</span>
                <span className="font-medium text-yellow-600">
                  {reports.filter(r => r.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">In Progress:</span>
                <span className="font-medium text-blue-600">
                  {reports.filter(r => r.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Resolved:</span>
                <span className="font-medium text-green-600">
                  {reports.filter(r => r.status === 'resolved').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Rejected:</span>
                <span className="font-medium text-red-600">
                  {reports.filter(r => r.status === 'rejected').length}
                </span>
              </div>
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 min-w-[180px] z-10">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Map Legend</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full border border-white"></div>
                <span>⏳ Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full border border-white"></div>
                <span>🔧 In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full border border-white"></div>
                <span>✅ Resolved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border border-white"></div>
                <span>❌ Rejected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden md:flex md:w-80 xl:w-96 bg-white border-l border-gray-200 overflow-y-auto relative z-10 flex-col">
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
            <h3 className="text-lg font-bold text-gray-900">Recent Reports</h3>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No reports found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.slice(0, 14).map((report) => (
                  <div
                    key={report.id}
                    onClick={() => focusReportOnMap(report)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedReport?.id === report.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <h4 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2">
                        {report.title}
                      </h4>
                      <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <span className="truncate max-w-[55%] font-medium">{report.username}</span>
                      <span className="font-medium">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Status Management Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['pending','in_progress','resolved','rejected'] as const)
                        .filter(target => target !== report.status)
                        .sort((a, b) => {
                          // Preferred order depending on current status
                          const orderMap: Record<typeof report.status, Record<string, number>> = {
                            pending: { in_progress: 0, resolved: 1, rejected: 2, pending: 99 },
                            in_progress: { resolved: 0, rejected: 1, pending: 2, in_progress: 99 },
                            resolved: { in_progress: 0, pending: 1, rejected: 2, resolved: 99 },
                            rejected: { pending: 0, in_progress: 1, resolved: 2, rejected: 99 },
                          } as any;
                          return (orderMap[report.status] as any)[a] - (orderMap[report.status] as any)[b];
                        })
                        .map(target => (
                          <button
                            key={target}
                            onClick={() => handleReportAction(report.id, target)}
                            className={
                              target === 'pending'
                                ? 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-800 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-colors'
                                : target === 'in_progress'
                                ? 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors'
                                : target === 'resolved'
                                ? 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors'
                                : 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors'
                            }
                            title={
                              target === 'pending'
                                ? 'Mark Pending'
                                : target === 'in_progress'
                                ? 'Mark In Progress'
                                : target === 'resolved'
                                ? 'Mark Resolved'
                                : 'Reject'
                            }
                          >
                            {target === 'resolved' ? (
                              <Check className="w-4 h-4" />
                            ) : target === 'rejected' ? (
                              <X className="w-4 h-4" />
                            ) : (
                              <Wrench className="w-4 h-4" />
                            )}
                            {target === 'pending'
                              ? 'Pending'
                              : target === 'in_progress'
                              ? 'Progress'
                              : target === 'resolved'
                              ? 'Resolved'
                              : 'Reject'}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-up List */}
      {showMobileList && (
        <div className="md:hidden fixed inset-0 z-[9998]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileList(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Recent Reports</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowMobileList(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Mobile Filters */}
            <div className="px-4 pt-3 pb-1 border-b">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No reports found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => {
                        setShowMobileList(false);
                        focusReportOnMap(report);
                      }}
                      className="p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md border-gray-200 hover:border-gray-300"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {report.title}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{report.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{report.username}</span>
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Status Management Buttons - Mobile */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {(['pending','in_progress','resolved','rejected'] as const)
                          .filter(target => target !== report.status)
                          .sort((a, b) => {
                            // Preferred order depending on current status
                            const orderMap: Record<typeof report.status, Record<string, number>> = {
                              pending: { in_progress: 0, resolved: 1, rejected: 2, pending: 99 },
                              in_progress: { resolved: 0, rejected: 1, pending: 2, in_progress: 99 },
                              resolved: { in_progress: 0, pending: 1, rejected: 2, resolved: 99 },
                              rejected: { pending: 0, in_progress: 1, resolved: 2, rejected: 99 },
                            } as any;
                            return (orderMap[report.status] as any)[a] - (orderMap[report.status] as any)[b];
                          })
                          .map(target => (
                            <button
                              key={target}
                              onClick={() => handleReportAction(report.id, target)}
                              className={
                                target === 'pending'
                                  ? 'inline-flex items-center gap-1 px-2 py-1 text-xs text-yellow-800 bg-yellow-50 hover:bg-yellow-100 rounded border border-yellow-200 transition-colors'
                                  : target === 'in_progress'
                                  ? 'inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors'
                                  : target === 'resolved'
                                  ? 'inline-flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors'
                                  : 'inline-flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors'
                              }
                              title={
                                target === 'pending'
                                  ? 'Mark Pending'
                                  : target === 'in_progress'
                                  ? 'Mark In Progress'
                                  : target === 'resolved'
                                  ? 'Mark Resolved'
                                  : 'Reject'
                              }
                            >
                              {target === 'resolved' ? (
                                <Check className="w-4 h-4" />
                              ) : target === 'rejected' ? (
                                <X className="w-4 h-4" />
                              ) : (
                                <Wrench className="w-4 h-4" />
                              )}
                              {target === 'pending'
                                ? 'Pending'
                                : target === 'in_progress'
                                ? 'Progress'
                                : target === 'resolved'
                                ? 'Resolved'
                                : 'Reject'}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportModal && selectedReportForModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{selectedReportForModal.title}</h2>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedReportForModal(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Issue Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Issue Description</h3>
                <p className="text-gray-900">{selectedReportForModal.description}</p>
              </div>

              {/* Category and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    {selectedReportForModal.category}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Priority</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedReportForModal.priority)}`}>
                    {selectedReportForModal.priority}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedReportForModal.status)}`}>
                  {selectedReportForModal.status.replace('_', ' ')}
                </span>
              </div>

              {/* Reporter Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Reported By</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedReportForModal.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedReportForModal.username}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedReportForModal.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                <div className="flex items-center gap-2 text-gray-900">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{selectedReportForModal.location_address}</span>
                </div>
              </div>

              {/* Images */}
              {selectedReportForModal.images && selectedReportForModal.images.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">IMAGES</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedReportForModal.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Report image ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setSelectedImage(image);
                          setShowImageModal(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedReportForModal(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[10003] p-4">
          <div className="relative max-w-[95vw] max-h-[95vh]">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>
            
            {/* Image */}
            <img
              src={selectedImage}
              alt="Full size report image"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            
            {/* Navigation Arrows (if multiple images) */}
            {selectedReportForModal?.images && selectedReportForModal.images.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={() => {
                    const currentIndex = selectedReportForModal.images.indexOf(selectedImage);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : selectedReportForModal.images.length - 1;
                    setSelectedImage(selectedReportForModal.images[prevIndex]);
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all hover:scale-110"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Next Button */}
                <button
                  onClick={() => {
                    const currentIndex = selectedReportForModal.images.indexOf(selectedImage);
                    const nextIndex = currentIndex < selectedReportForModal.images.length - 1 ? currentIndex + 1 : 0;
                    setSelectedImage(selectedReportForModal.images[nextIndex]);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all hover:scale-110"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedReportForModal.images.indexOf(selectedImage) + 1} / {selectedReportForModal.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cluster Reports Modal */}
      {showClusterModal && clusterReports.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Reports at Same Location</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {clusterReports.length} reports at {clusterReports[0]?.location_address}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowClusterModal(false);
                  setClusterReports([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid gap-4">
                {clusterReports.map((report, index) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">{report.title}</h3>
                        <p className="text-gray-700 mb-2">{report.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(report.priority)}`}>
                          {report.priority}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <span className="ml-2 text-gray-900">{report.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Reporter:</span>
                        <span className="ml-2 text-gray-900">{report.username}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <span className="ml-2 text-gray-900">{report.location_address}</span>
                      </div>
                    </div>

                    {/* Status Management Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['pending','in_progress','resolved','rejected'] as const)
                        .filter(target => target !== report.status)
                        .sort((a, b) => {
                          const orderMap: Record<typeof report.status, Record<string, number>> = {
                            pending: { in_progress: 0, resolved: 1, rejected: 2, pending: 99 },
                            in_progress: { resolved: 0, rejected: 1, pending: 2, in_progress: 99 },
                            resolved: { in_progress: 0, pending: 1, rejected: 2, resolved: 99 },
                            rejected: { pending: 0, in_progress: 1, resolved: 2, rejected: 99 },
                          } as any;
                          return (orderMap[report.status] as any)[a] - (orderMap[report.status] as any)[b];
                        })
                        .map(target => (
                          <button
                            key={target}
                            onClick={() => handleReportAction(report.id, target)}
                            className={
                              target === 'pending'
                                ? 'inline-flex items-center gap-1 px-3 py-2 text-sm text-yellow-800 bg-yellow-50 hover:bg-yellow-100 rounded border border-yellow-200 transition-colors'
                                : target === 'in_progress'
                                ? 'inline-flex items-center gap-1 px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors'
                                : target === 'resolved'
                                ? 'inline-flex items-center gap-1 px-3 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors'
                                : 'inline-flex items-center gap-1 px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors'
                            }
                            title={
                              target === 'pending'
                                ? 'Mark Pending'
                                : target === 'in_progress'
                                ? 'Mark In Progress'
                                : target === 'resolved'
                                ? 'Mark Resolved'
                                : 'Reject'
                            }
                          >
                            {target === 'resolved' ? (
                              <Check className="w-4 h-4" />
                            ) : target === 'rejected' ? (
                              <X className="w-4 h-4" />
                            ) : (
                              <Wrench className="w-4 h-4" />
                            )}
                            {target === 'pending'
                              ? 'Pending'
                              : target === 'in_progress'
                              ? 'Progress'
                              : target === 'resolved'
                              ? 'Resolved'
                              : 'Reject'}
                          </button>
                        ))}
                    </div>

                    {/* View Full Details Button */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setSelectedReportForModal(report);
                          setShowReportModal(true);
                          setShowClusterModal(false);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline"
                      >
                        View full details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowClusterModal(false);
                  setClusterReports([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-[10001]">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
    </div>
  );
}
