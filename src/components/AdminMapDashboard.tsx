import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { awardPoints, awardCustomPoints } from '../lib/points';
import { 
  MapPin, 
  AlertTriangle, 
  Check, 
  X, 
  Eye, 
  Filter,
  Search,
  
  RefreshCw,
  Layers,
  Wrench,
  ChevronDown,
  ChevronUp,
  Hash,
  FileText,
  User2
} from 'lucide-react';
import { Notification } from './Notification';
import { ImageViewer } from './ImageViewer';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'verifying' | 'pending' | 'in_progress' | 'awaiting_verification' | 'resolved' | 'declined' | 'rejected' | 'cancelled';
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
  patrol_user_id?: string | null;
  patrol_username?: string | null;
  case_number?: string;
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
  // navigate is not used in this component; remove to satisfy lint
  const [searchParams] = useSearchParams();
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
  
  // Read URL parameters for initial map center/zoom
  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const urlZoom = searchParams.get('zoom');
  const urlReportId = searchParams.get('reportId');
  
  // Initialize map center and zoom from URL params or defaults
  const initialCenter: [number, number] = urlLat && urlLng 
    ? [parseFloat(urlLat), parseFloat(urlLng)]
    : [14.8386, 120.1881]; // Default to Castillejos, Zambales, Philippines
  const initialZoom = urlZoom ? parseInt(urlZoom, 10) : 14;
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportForModal, setSelectedReportForModal] = useState<Report | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [clusterReports, setClusterReports] = useState<Report[]>([]);
  // clusterPosition is only set when opening cluster modal; keep setter to avoid unused variable lint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setClusterPosition] = useState<[number, number]>([0, 0]);

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

  // Update map center/zoom if URL parameters are present and map is already initialized
  useEffect(() => {
    if (urlLat && urlLng && mapInitialized && mapInstance.current) {
      const lat = parseFloat(urlLat);
      const lng = parseFloat(urlLng);
      const zoomLevel = urlZoom ? parseInt(urlZoom, 10) : 16;
      
      if (!isNaN(lat) && !isNaN(lng)) {
        mapInstance.current.setView([lat, lng], zoomLevel, {
          animate: true,
          duration: 0.8
        });
      }
    }
  }, [urlLat, urlLng, urlZoom, mapInitialized]);

  useEffect(() => {
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      updateMapMarkers();
    }, 100);
  }, [reports, filter, searchTerm]);

  // Focus on report from URL parameters after map and markers are ready
  useEffect(() => {
    if (!urlReportId || !mapInitialized || !mapInstance.current || reports.length === 0) return;
    
    // Wait a bit for markers to be rendered
    const timer = setTimeout(() => {
      const targetReport = reports.find(r => r.id === urlReportId);
      if (targetReport) {
        focusReportOnMap(targetReport);
        // Optionally open the marker popup
        const marker = markerRefs.current.get(targetReport.id);
        if (marker && marker.openPopup) {
          marker.openPopup();
        }
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [urlReportId, mapInitialized, reports, mapInstance.current]);

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
        const el: any = mapRef.current;
        el.innerHTML = '';
        if (el._leaflet_id) {
          delete el._leaflet_id;
        }
        // Clear our custom map ID
        if (el.dataset && el.dataset.mapId) {
          delete el.dataset.mapId;
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
      const containerEl: any = mapRef.current;
      if (containerEl._leaflet_id || containerEl.querySelector('.leaflet-container') || containerEl.querySelector('.leaflet-map-pane')) {
        console.log('Container already has Leaflet elements, cleaning up...');
        try {
          // Clear the container completely
          containerEl.innerHTML = '';
          // Remove any Leaflet references
          if (containerEl._leaflet_id) {
            delete containerEl._leaflet_id;
          }
          // Also check for any other Leaflet-related attributes
          const leafletAttrs = ['data-leaflet-id', 'data-leaflet-layer-id'];
          leafletAttrs.forEach(attr => {
            try {
              if (containerEl.hasAttribute && containerEl.hasAttribute(attr)) {
                containerEl.removeAttribute(attr);
              }
            } catch {}
          });
        } catch (cleanupError) {
          console.log('Error cleaning up existing map from container:', cleanupError);
        }
        
        // Small delay to ensure DOM cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Final safety check - ensure container is completely clean
      if (mapRef.current && (mapRef.current as any).children && (mapRef.current as any).children.length > 0) {
        console.log('Container still has children after cleanup, forcing clear...');
        (mapRef.current as any).innerHTML = '';
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      // Initialize map with zoom controls disabled to prevent duplicates
      mapInstance.current = L.map(mapRef.current, { 
        preferCanvas: true,
        zoomControl: false 
      }).setView(mapCenter, zoom);

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

      // Add a single set of zoom controls at top-right position
      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);

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
        const importedLeaflet: any = await import('leaflet');
        const LF: any = (importedLeaflet && (importedLeaflet as any).default) || importedLeaflet;
      
      // Check if map instance is still valid and has required methods
      if (!mapInstance.current || 
          typeof mapInstance.current.getContainer !== 'function' ||
          typeof mapInstance.current.addTo !== 'function') {
        console.log('Map instance not ready for custom controls');
        return;
      }
      
      // Real-time toggle control
        const realTimeControl = LF.Control.extend({
        options: {
          position: 'topright'
        },
        onAdd: function() {
            const container = LF.DomUtil.create('div', 'leaflet-bar leaflet-control');
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

  new realTimeControl().addTo(mapInstance.current);
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
      const { data: reportsRows, error: reportsError } = await supabase
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
          patrol_user_id,
          images,
          case_number
        `)
        .order('created_at', { ascending: false })
        .range(0, 49);

      const reportsData: any[] = (reportsRows as any) || [];
      if (reportsError) throw reportsError;

      // Try to get usernames for all user_ids and patrol_user_ids from profiles table
      let userMap = new Map();
      let patrolUserMap = new Map();
  const userIds = [...new Set((reportsData || []).map((report: any) => report.user_id))];
  const patrolUserIds = [...new Set((reportsData || []).map((report: any) => report.patrol_user_id).filter(Boolean))];
      
      if (userIds.length > 0 || patrolUserIds.length > 0) {
        try {
          const allUserIds = [...userIds, ...patrolUserIds];
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', allUserIds);
          const profilesArr: any[] = (profilesData as any) || [];

          if (!profilesError && profilesArr) {
            profilesArr.forEach((profile: any) => {
              userMap.set(profile.id, profile.username);
              if (patrolUserIds.includes(profile.id)) {
                patrolUserMap.set(profile.id, profile.username);
              }
            });
          }
        } catch (error) {
          // Silently handle the case where profiles table doesn't exist
          console.log('Profiles table not found, using fallback usernames');
        }
      }

      // Fast formatting first; defer geocoding to background queue
  const formattedReports: Report[] = (reportsData || []).map((report: any) => {
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
          username: userMap.get(report.user_id) || `User ${String(report.user_id || '').slice(0, 8)}`,
          patrol_username: report.patrol_user_id ? (patrolUserMap.get(report.patrol_user_id) || `Patrol ${String(report.patrol_user_id).slice(0, 8)}`) : null,
          avatar_url: null,
          location
        } as Report;
      });

            // Get patrol officers from profiles table
      let patrolOfficers: { id: string; username: string }[] = [];
      try {
        const { data: patrolData, error: patrolError } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('role', 'patrol');

        if (!patrolError && patrolData) {
          patrolOfficers = patrolData as any;
        }
      } catch (error) {
        console.log('Error fetching patrol officers:', error);
      }

      // Add patrol officer information to reports that are in progress but don't have patrol_user_id
      const updatedReports = formattedReports.map(report => {
        if (report.status === 'in_progress' && !report.patrol_user_id) {
          // Assign a random patrol officer to reports in progress
          if (patrolOfficers.length > 0) {
            const randomPatrol = patrolOfficers[Math.floor(Math.random() * patrolOfficers.length)];
            return {
              ...report,
              patrol_user_id: randomPatrol.id,
              patrol_username: randomPatrol.username
            };
          }
        }
        return report;
      });
      
      // Store all reports (including declined) for the declined button
      setReports(updatedReports);
      
      // Cache for next visit for instant paint
      try { sessionStorage.setItem('admin_map_reports_v1', JSON.stringify({ data: updatedReports, ts: Date.now() })); } catch {}
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
          images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop'],
          case_number: '000001'
        },
        {
          id: 'demo-2',
          title: 'Uncollected Garbage',
          description: 'Could cause harm.',
          category: 'environmental',
          status: 'in_progress',
          priority: 'high',
          location: { lat: 14.8386, lng: 120.1881 },
          location_address: 'Ablao Street, San Pablo, Castillejos, Zambales, Central Luzon, 2208, Philippines',
          created_at: new Date(Date.now() - 259200000).toISOString(),
          user_id: 'demo-user-2',
          username: 'Leo',
          avatar_url: null,
          images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop'],
          patrol_user_id: 'patrol-demo',
          patrol_username: 'patrol demo',
          case_number: '000004'
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
          username: 'kevin',
          avatar_url: null,
          images: [],
          patrol_user_id: 'patrol-demo',
          patrol_username: 'patrol demo',
          case_number: '000003'
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
          const profileAny: any = profileData as any;

          if (!profileError && profileAny && profileAny.username) {
            username = profileAny.username;
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
    if (report.status === 'resolved') return; // Do not add resolved reports to the map
    if (!mapInstance.current || !markersLayer.current || !report.location?.lat || !report.location?.lng) return;

    try {
      const importedLeaflet: any = await import('leaflet');
      const LF: any = (importedLeaflet && (importedLeaflet as any).default) || importedLeaflet;
      
      // Check if map and markers layer are still valid
      if (!mapInstance.current || !markersLayer.current || !mapInstance.current.getContainer) {
        console.log('Map or markers layer not ready for new marker');
        return;
      }
      
      // Create marker with new report styling
      const marker = LF.marker([report.location.lat, report.location.lng], {
        icon: LF.divIcon({
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
      const importedLeaflet: any = await import('leaflet');
      const LF: any = (importedLeaflet && (importedLeaflet as any).default) || importedLeaflet;
      
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
        // Always exclude resolved and declined reports from the map
        if (report.status === 'resolved' || report.status === 'declined') return false;
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
             marker = LF.marker(markerData.position, {
               icon: LF.divIcon({
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
             
             marker = LF.marker(markerData.position, {
               icon: LF.divIcon({
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
           const group = LF.featureGroup(newMarkers.map((m: any) => LF.marker(m.position)));
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
    if (status === 'verifying') return 'bg-purple-500';
    if (status === 'pending') return 'bg-yellow-500';
    if (status === 'in_progress') return 'bg-blue-500';
    if (status === 'awaiting_verification') return 'bg-orange-500';
    if (status === 'resolved') return 'bg-green-500';
    const statusLower = status?.toLowerCase();
    if (statusLower === 'declined' || statusLower === 'rejected') return 'bg-red-500';
    
    // Fallback based on priority
    if (priority === 'high') return 'bg-red-500';
    if (priority === 'medium') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getMarkerIcon = (status: string, priority: string): string => {
    // Return appropriate icon based on status and priority
    if (status === 'verifying') return '🔍';
    if (status === 'pending') return '⏳';
    if (status === 'in_progress') return '🔧';
    if (status === 'awaiting_verification') return '📋';
    if (status === 'resolved') return '✅';
    if (status === 'declined' || status === 'rejected') return '❌';
    
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
                ${(status === 'declined' || status === 'rejected') ? 'Declined' : status.replace('_', ' ')}: ${count}
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
          <span class="px-2 py-1 rounded-full ${getStatusColor(report.status)} font-medium">${(report.status === 'declined' || report.status === 'rejected') ? 'Declined' : report.status.replace('_', ' ')}</span>
          <span class="px-2 py-1 rounded-full ${getPriorityColor(report.priority)} font-medium">${(report.priority || '').charAt(0).toUpperCase() + (report.priority || '').slice(1)}</span>
        </div>
        ${(() => { const lvl = getEffectiveLevel(report as any); return typeof lvl === 'number' ? `
          <div class="text-xs mb-2">
            <span class="px-2 py-1 rounded-full font-medium ${(lvl >= 5 ? 'bg-red-100 text-red-800' : lvl >= 4 ? 'bg-orange-100 text-orange-800' : lvl >= 3 ? 'bg-yellow-100 text-yellow-800' : lvl >= 2 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800')}">
              Level ${lvl} · ${getServiceLevelText(lvl)}
            </span>
          </div>
        ` : '' })()}
        <div class="text-xs text-gray-500 mb-2">
          <div><strong>Location:</strong> ${report.location_address}</div>
          <div><strong>Reporter:</strong> ${report.username}</div>
          <div><strong>Date:</strong> ${new Date(report.created_at).toLocaleDateString()}</div>
          ${report.case_number ? `<div><strong>Case #:</strong> ${report.case_number}</div>` : ''}
        </div>
        <button data-view-details data-report-id="${report.id}" class="mt-2 w-full text-center text-sm text-blue-600 hover:text-blue-700 font-semibold border-t pt-2 cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors">
          View full details →
        </button>
      </div>
    `;
  };

  const getStatusColor = (status: string): string => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'verifying': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'awaiting_verification': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'declined':
      case 'rejected': // Backward compatibility
        return 'bg-red-100 text-red-800';
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

  // Map report priority to a default case level when explicit level is absent
  const deriveLevelFromPriority = (priority?: Report['priority']): number | null => {
    if (!priority) return null;
    switch (priority) {
      case 'high': return 5;
      case 'medium': return 3;
      case 'low': return 1;
      default: return null;
    }
  };

  const getEffectiveLevel = (r: Report): number | null => {
    // Admin map Report type may not include priority_level; derive from priority
    return deriveLevelFromPriority(r.priority);
  };

  const getServiceLevelText = (level: number): string => {
    switch (level) {
      case 5: return 'Total loss of service';
      case 4: return 'Reduction of service';
      case 3: return "Can continue work but can't complete most tasks";
      case 2: return 'Service work around available';
      case 1:
      default: return 'Minor inconvenience';
    }
  };

  const capitalize = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  const updateSpecificMarker = async (reportId: string, newStatus: Report['status']) => {
    console.log('updateSpecificMarker called:', reportId, newStatus);
    
    if (!mapInstance.current || !markersLayer.current) {
      console.log('Map or markers layer not ready');
      return;
    }

    try {
      
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

      // If report becomes resolved, remove it from the map and refs
      if (newStatus === 'resolved') {
        try {
          existingMarker.remove();
        } catch {}
        markerRefs.current.delete(reportId);
        return;
      }

  // Intentionally recreate marker visuals via a full refresh below; no local icon reuse required here.

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

  const givePatrolRewards = async (patrolUserId: string, priority: string) => {
    try {
      // Align with patrol experience mapping used in profile/dashboard
      const points = priority === 'high' ? 50 : priority === 'medium' ? 25 : 10;

      // Use unified points RPC so profile total points stays consistent
      await awardCustomPoints(patrolUserId, points, 'PATROL_RESOLVED');

      // Show reward notification
      showNotification(`Patrol officer rewarded: +${points} points`, 'success');
    } catch (error) {
      console.error('Error giving patrol rewards:', error);
      showNotification('Failed to give patrol rewards', 'error');
    }
  };

  const giveReporterRewards = async (reporterUserId: string, reportId: string, reason: 'REPORT_VERIFIED' | 'REPORT_RESOLVED') => {
    try {
      // Award points to the reporter using the existing points system
      const pointsAwarded = await awardPoints(reporterUserId, reason, reportId);
      
      // Show reward notification
      const reasonText = reason === 'REPORT_VERIFIED' ? 'verified' : 'resolved';
      showNotification(`Reporter rewarded for ${reasonText} report: +${pointsAwarded} points`, 'success');

    } catch (error) {
      console.error('Error giving reporter rewards:', error);
      showNotification('Failed to give reporter rewards', 'error');
    }
  };

  const handleReportAction = async (reportId: string, newStatus: Report['status']) => {
    try {
      // Get the current report to check status transitions
      const currentReport = reports.find(r => r.id === reportId);
      const isVerifyingReport = currentReport?.status === 'verifying' && newStatus === 'in_progress';
      const isCompletingReport = currentReport?.status === 'in_progress' && newStatus === 'resolved';

      // If verifying a report (moving from verifying to in_progress), give verification rewards to reporter
      if (isVerifyingReport) {
        await giveReporterRewards(currentReport.user_id, reportId, 'REPORT_VERIFIED');
      }

      // If completing a report (moving from in_progress to resolved), give rewards to both patrol officer and reporter
      if (isCompletingReport) {
        // Give rewards to patrol officer if assigned
        if (currentReport?.patrol_user_id) {
          await givePatrolRewards(currentReport.patrol_user_id, currentReport.priority);
        }
        
        // Give rewards to the reporter for resolution
        await giveReporterRewards(currentReport.user_id, reportId, 'REPORT_RESOLVED');
      }

      const { error } = await (supabase as any)
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      const actionText = newStatus === 'in_progress' ? 'approved' : 
                        newStatus === 'resolved' ? (isCompletingReport ? 'completed and resolved' : 'resolved') : 
                        newStatus === 'declined' ? 'declined' : 
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

  // Filter logic is applied directly where needed (map and UI chips) to avoid unused intermediate values

  return (
    <div className="h-screen bg-gray-50 pt-0">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 supports-[backdrop-filter]:bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
                    <ol className="flex items-center space-x-1">
                      <li>Admin</li>
                      <li className="text-gray-300">/</li>
                      <li className="font-medium text-gray-700">Map</li>
                    </ol>
                  </nav>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin • Map</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="hidden sm:flex items-center bg-white shadow-sm border border-gray-200 rounded-xl">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  aria-pressed={showFilters}
                  aria-label="Toggle filters"
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-colors ${showFilters ? 'bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="hidden md:inline">Filters</span>
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button
                  onClick={fetchReports}
                  disabled={loading}
                  aria-busy={loading}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">Refresh</span>
                </button>
              </div>
              {/* Compact actions for small screens */}
              <div className="sm:hidden flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 bg-white rounded-full border border-gray-200 shadow-sm"
                  aria-label="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button
                  onClick={fetchReports}
                  disabled={loading}
                  className="p-2 bg-blue-600 text-white rounded-full shadow-sm disabled:opacity-60"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="border-t border-gray-100 bg-white/80 supports-[backdrop-filter]:bg-white/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {([
                { key: 'all', label: 'All' },
                { key: 'verifying', label: 'Verifying' },
                { key: 'pending', label: 'Pending' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'awaiting_verification', label: 'Awaiting Verification' }
              ] as Array<{ key: 'all' | Report['status']; label: string }>).map(({ key, label }) => {
                const nonResolvedDeclined = reports.filter(r => {
                  const status = r.status?.toLowerCase();
                  return status !== 'resolved' && status !== 'declined' && status !== 'rejected';
                });
                const count = key === 'all' ? nonResolvedDeclined.length : nonResolvedDeclined.filter(r => r.status === key).length;
                const isActive = filter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`${isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} inline-flex items-center gap-2 px-3 py-1.5 border ${isActive ? 'border-blue-600' : 'border-gray-300'} rounded-full text-sm transition-colors hover:bg-gray-50`}
                    title={`Filter: ${label}`}
                    aria-pressed={isActive}
                  >
                    <span>{label}</span>
                    <span className={`${isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} text-xs px-2 py-0.5 rounded-full`} aria-label={`${label} count`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Reports</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by title, description, or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="verifying">Verifying</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="awaiting_verification">Awaiting Verification</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Real-Time Updates</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="realTimeToggle"
                      checked={realTimeEnabled}
                      onChange={(e) => setRealTimeEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="realTimeToggle" className="text-sm text-gray-700">
                      Enable real-time updates
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-112px)]">
        {/* Map */}
        <div className="relative z-0 flex-1 w-full min-h-0">
          <div ref={mapRef} className="w-full h-full" />

          {/* Report Summary and Map Legend - Top Overlay */}
          <div className="absolute top-4 left-0 right-4 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 z-[1001] pointer-events-none px-4 md:px-4 md:left-[200px]">
            {/* Report Summary */}
            <div className="bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 md:p-4 min-w-[200px] pointer-events-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Report Summary</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium">{reports.filter(r => r.status !== 'resolved' && r.status !== 'in_progress' && r.status !== 'awaiting_verification').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Patrol:</span>
                  <span className="font-medium text-orange-600">
                    {reports.filter(r => r.status === 'in_progress' || r.status === 'awaiting_verification').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-medium text-yellow-600">
                    {reports.filter(r => r.status === 'pending').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Map Legend */}
            <div className="bg-white/90 backdrop-blur rounded-lg shadow-lg select-none pointer-events-auto">
              <div 
                className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => setShowLegend(!showLegend)}
              >
                <h3 className="text-sm font-medium text-gray-700">Map Legend</h3>
                <div className="flex items-center gap-2">
                  {showLegend ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>
              {showLegend && (
                <div className="px-3 pb-3 min-w-[200px]">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white bg-purple-500"></div>
                      <span>Verifying</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white bg-yellow-500"></div>
                      <span>Pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white bg-blue-500"></div>
                      <span>In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white bg-orange-500"></div>
                      <span>Awaiting Verification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white bg-red-500"></div>
                      <span>Declined</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map Loading/Error State */}
          {!mapInstance.current && (
            <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                {mapError ? (
                  <>
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 mb-2">{mapError}</p>
                    <div className="space-x-2">
                      <button
                        onClick={refreshMap}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Refresh Map
                      </button>
                      <button
                        onClick={() => setMapError(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                      >
                        Dismiss
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
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
          <div className="absolute top-4 left-4 space-y-2 z-[1002]">
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
            <button
              onClick={() => {
                try {
                  if (mapInstance.current) {
                    mapInstance.current.setView(mapCenter, 14);
                  }
                } catch (error) {
                  console.log('Error resetting view:', error);
                }
              }}
              className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white transition-colors"
              title="Reset View"
            >
              <RefreshCw className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>


      {/* Report Details Modal */}
      {showReportModal && selectedReportForModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Modal Header - Enhanced */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedReportForModal.title}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedReportForModal.case_number && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        <Hash className="w-3 h-3" />
                        Case #{selectedReportForModal.case_number}
                      </span>
                    )}
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedReportForModal.status)}`}>
                      {selectedReportForModal.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedReportForModal.priority)}`}>
                      {selectedReportForModal.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setSelectedReportForModal(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content - Enhanced */}
            <div className="p-6 space-y-6">
              {/* Issue Description - Featured */}
              <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Issue Description</span>
                </div>
                <p className="text-gray-900 leading-relaxed">{selectedReportForModal.description}</p>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Category</h3>
                  <p className="text-sm font-semibold text-gray-900">{selectedReportForModal.category}</p>
                </div>

                {/* Service Level */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Service Level</h3>
                  {(() => { 
                    const lvl = getEffectiveLevel(selectedReportForModal); 
                    return typeof lvl === 'number' ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Level {lvl}</p>
                        <p className="text-xs text-gray-600 mt-1">{getServiceLevelText(lvl)}</p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">Not specified</p>
                    );
                  })()}
                </div>
              </div>

              {/* Reporter Information */}
              <div className="border-l-4 border-blue-500 bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User2 className="w-4 h-4 text-blue-600" />
                  Reporter Information
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedReportForModal.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{selectedReportForModal.username}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      📅 {new Date(selectedReportForModal.created_at).toLocaleDateString()} • ⏰ {new Date(selectedReportForModal.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Patrol Officer Information */}
              {(selectedReportForModal.patrol_username || selectedReportForModal.patrol_user_id) && (
                <div className="border-l-4 border-orange-500 bg-orange-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User2 className="w-4 h-4 text-orange-600" />
                    Assigned Patrol Officer
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {(selectedReportForModal.patrol_username || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {selectedReportForModal.patrol_username || `Patrol Officer`}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Status: <span className="text-green-600 font-semibold">Assigned</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Information */}
              <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span>Location</span>
                </div>
                <p className="text-sm text-gray-900 leading-relaxed">{selectedReportForModal.location_address}</p>
                {selectedReportForModal.location?.lat && selectedReportForModal.location?.lng && (
                  <p className="text-xs text-gray-500 mt-2">
                    📍 Coordinates: {selectedReportForModal.location.lat.toFixed(4)}, {selectedReportForModal.location.lng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Images Section */}
              {selectedReportForModal.images && selectedReportForModal.images.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Images</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedReportForModal.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                        onClick={() => {
                          setSelectedImage(image);
                          setShowImageModal(true);
                        }}
                      >
                        <img
                          src={image}
                          alt={`Report image ${index + 1}`}
                          className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {index + 1}/{selectedReportForModal.images.length}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional meta removed to streamline modal (Report ID and Last Updated removed) */}
            </div>

            {/* Modal Footer - Enhanced */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => focusReportOnMap(selectedReportForModal)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Focus on Map
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedReportForModal(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Modal */}
      {showImageModal && selectedImage && (
        <ImageViewer
          isOpen={showImageModal}
          onClose={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
          imageUrl={selectedImage}
          alt="Full size report image"
          images={selectedReportForModal?.images || []}
          currentIndex={selectedReportForModal?.images ? selectedReportForModal.images.indexOf(selectedImage) : 0}
          onPrevious={() => {
            if (selectedReportForModal?.images) {
              const currentIndex = selectedReportForModal.images.indexOf(selectedImage);
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : selectedReportForModal.images.length - 1;
              setSelectedImage(selectedReportForModal.images[prevIndex]);
            }
          }}
          onNext={() => {
            if (selectedReportForModal?.images) {
              const currentIndex = selectedReportForModal.images.indexOf(selectedImage);
              const nextIndex = currentIndex < selectedReportForModal.images.length - 1 ? currentIndex + 1 : 0;
              setSelectedImage(selectedReportForModal.images[nextIndex]);
            }
          }}
          showNavigation={!!(selectedReportForModal?.images && selectedReportForModal.images.length > 1)}
        />
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
                {clusterReports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">{report.title}</h3>
                        <p className="text-gray-700 mb-2">{report.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                          {(report.status === 'declined' || report.status === 'rejected') ? 'Declined' : report.status.replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(report.priority)}`}>
                          {capitalize(report.priority)}
                        </span>
                        {(() => { const lvl = getEffectiveLevel(report); return typeof lvl === 'number' ? (
                          <span className={`${lvl >= 5 ? 'bg-red-100 text-red-800' : lvl >= 4 ? 'bg-orange-100 text-orange-800' : lvl >= 3 ? 'bg-yellow-100 text-yellow-800' : lvl >= 2 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'} px-3 py-1 rounded-full text-sm font-medium`} title={getServiceLevelText(lvl)}>
                            Level {lvl} · {getServiceLevelText(lvl)}
                          </span>
                        ) : null; })()}
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
                      {report.case_number && (
                        <div>
                          <span className="text-gray-500">Case #:</span>
                          <span className="ml-2 text-gray-900 flex items-center">
                            <Hash className="h-3 w-3 mr-1" />
                            {report.case_number}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <span className="ml-2 text-gray-900">{report.location_address}</span>
                      </div>
                    </div>

                    {/* Status Management Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['verifying','pending','in_progress','awaiting_verification','resolved','declined'] as const)
                        .filter(target => {
                          // Filter out current status
                          if (target === report.status) return false;
                          // Filter out 'declined' if report is already 'rejected' (they're treated the same)
                          if (target === 'declined' && report.status === 'rejected') return false;
                          return true;
                        })
                        .sort((a, b) => {
                          const orderMap: Record<string, Record<string, number>> = {
                            verifying: { pending: 0, in_progress: 1, awaiting_verification: 2, resolved: 3, declined: 4, verifying: 99 },
                            pending: { in_progress: 0, awaiting_verification: 1, resolved: 2, declined: 3, pending: 99 },
                            in_progress: { awaiting_verification: 0, resolved: 1, declined: 2, pending: 3, in_progress: 99 },
                            awaiting_verification: { resolved: 0, declined: 1, pending: 2, in_progress: 3, awaiting_verification: 99 },
                            resolved: { in_progress: 0, pending: 1, declined: 2, resolved: 99 },
                            declined: { pending: 0, in_progress: 1, resolved: 2, declined: 99 },
                            rejected: { pending: 0, in_progress: 1, resolved: 2, declined: 99 }, // Handle rejected as declined
                          };
                          const currentStatusMap = orderMap[report.status || ''] || {};
                          const orderA = currentStatusMap[a] ?? 99;
                          const orderB = currentStatusMap[b] ?? 99;
                          return orderA - orderB;
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
                                : target === 'awaiting_verification'
                                ? 'inline-flex items-center gap-1 px-3 py-2 text-sm text-orange-700 bg-orange-50 hover:bg-orange-100 rounded border border-orange-200 transition-colors'
                                : target === 'resolved'
                                ? 'inline-flex items-center gap-1 px-3 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors'
                                : 'inline-flex items-center gap-1 px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors'
                            }
                            title={
                              target === 'pending'
                                ? 'Mark Pending'
                                : target === 'in_progress'
                                ? 'Mark In Progress'
                                : target === 'awaiting_verification'
                                ? 'Mark Awaiting Verification'
                                : target === 'resolved'
                                ? 'Mark Resolved'
                                : 'Decline'
                            }
                          >
                            {target === 'resolved' ? (
                              <Check className="w-4 h-4" />
                            ) : target === 'declined' ? (
                              <X className="w-4 h-4" />
                            ) : target === 'awaiting_verification' ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <Wrench className="w-4 h-4" />
                            )}
                            {target === 'pending'
                              ? 'Pending'
                              : target === 'in_progress'
                              ? 'Progress'
                              : target === 'awaiting_verification'
                              ? 'Verify'
                              : target === 'resolved'
                              ? 'Resolved'
                              : 'Decline'}
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
