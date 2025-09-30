import { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'
import { 
  createDeliveryRoute, 
  generateMockPackageDestinations, 
  formatDuration, 
  formatDistance,
  type DeliveryRoute,
  type RouteWaypoint 
} from "./lib/routing";
import { 
  getVehicles, 
  addVehicle as apiAddVehicle, 
  addPackage,
  assignPackageToVehicle,
  startSimulation,
  stopSimulation,
  type Vehicle as ApiVehicle,
  type Package as ApiPackage
} from "./lib/api";

// Types
interface Package {
  id: string;
  destination: string;
  weight: number;
  status: 'pending' | 'in-transit' | 'delivered';
  coordinates?: [number, number]; // [lng, lat]
}

interface Vehicle {
  vehicle_id: string;
  driver: string;
  status: 'on-time' | 'delayed' | 'idle' | 'active';
  location: string;
  speed: number;
  packages: Package[];
  lat?: number;
  lng?: number;
  next_stop?: string;
  eta?: string;
  progress?: number; // 0-100 for progress bar
  deliveryRoute?: DeliveryRoute;
}

interface NewVehicle {
  id: string;
  driver: string;
  location: string;
}

interface NewPackage {
  vehicleId: string;
  destination: string;
  weight: number;
}

interface LocationSuggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isFleetPanelCollapsed, setIsFleetPanelCollapsed] = useState(false);
  const [showVehicleDrawer, setShowVehicleDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState<'fleet' | 'add-vehicle' | 'add-packages' | 'simulation' | 'routing'>('fleet');
  const [isConnected, setIsConnected] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  
  // Form states
  const [newVehicle, setNewVehicle] = useState<NewVehicle>({ id: '', driver: '', location: '' });
  const [newPackage, setNewPackage] = useState<NewPackage>({ vehicleId: '', destination: '', weight: 0 });
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const routeLayerIds = useRef<string[]>([]);

  const mapboxToken = 'pk.eyJ1IjoibW5pZmFpIiwiYSI6ImNtZjM5dng3dzAxZWYybHEwdmZ2MmE4MDkifQ.CGxxP82dHH4tu6V9D6FhHg';

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12', // Colorful streets style
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 12,
      attributionControl: false,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Load vehicles from API with proper error handling
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const data = await getVehicles();
        setVehicles(data.map((v: any) => ({
          ...v,
          status: v.status === 'active' ? 'on-time' : v.status,
          packages: Array.isArray(v.packages) ? v.packages : [],
          progress: v.status === 'active' ? Math.floor(Math.random() * 100) : 0
        })));
        setIsConnected(true);
      } catch (error) {
        console.error("Failed to load vehicles:", error);
        setIsConnected(false);
        setVehicles([]);
      }
    };

    loadVehicles();
    const interval = setInterval(loadVehicles, 5000);
    return () => clearInterval(interval);
  }, []);

  // Clear route layers
  const clearRoutes = () => {
    if (!map.current) return;
    
    routeLayerIds.current.forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(layerId)) {
        map.current!.removeSource(layerId);
      }
    });
    routeLayerIds.current = [];
  };

  // Add route to map
  const addRouteToMap = (deliveryRoute: DeliveryRoute) => {
    if (!map.current || !deliveryRoute.routeGeometry) return;

    const routeId = `route-${deliveryRoute.vehicleId}`;
    const routeLineId = `route-line-${deliveryRoute.vehicleId}`;

    // Add route source
    map.current.addSource(routeId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: deliveryRoute.routeGeometry
      }
    });

    // Add route line layer
    map.current.addLayer({
      id: routeLineId,
      type: 'line',
      source: routeId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': getVehicleRouteColor(deliveryRoute.vehicleId),
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    routeLayerIds.current.push(routeLineId, routeId);
  };

  // Add checkpoints to map
  const addCheckpointsToMap = (deliveryRoute: DeliveryRoute) => {
    if (!map.current) return;

    deliveryRoute.waypoints.forEach((waypoint, index) => {
      // Create checkpoint marker
      const el = document.createElement('div');
      el.className = 'checkpoint-marker';
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      el.style.cursor = 'pointer';
      el.style.backgroundColor = waypoint.isDelivered ? '#10B981' : '#F59E0B';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontWeight = 'bold';
      el.style.color = 'white';
      el.style.fontSize = '12px';
      el.style.zIndex = '100';
      el.textContent = (index + 1).toString();

      // Create popup for checkpoint
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false
      }).setHTML(`
        <div style="padding: 12px; min-width: 200px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <div style="background: ${waypoint.isDelivered ? '#10B981' : '#F59E0B'}; 
                        width: 12px; height: 12px; border-radius: 50%; margin-right: 8px;"></div>
            <strong>Checkpoint ${index + 1}</strong>
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Package:</strong> ${waypoint.packageId || 'N/A'}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Address:</strong> ${waypoint.address}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>ETA:</strong> ${waypoint.estimatedTime || 'Calculating...'}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Status:</strong> 
            <span style="color: ${waypoint.isDelivered ? '#10B981' : '#F59E0B'};">
              ${waypoint.isDelivered ? 'Delivered' : 'Pending'}
            </span>
          </div>
        </div>
      `);

      // Add marker to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat(waypoint.coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      markers.current[`checkpoint-${waypoint.id}`] = marker;

      // Show popup on hover
      el.addEventListener('mouseenter', () => popup.addTo(map.current!));
      el.addEventListener('mouseleave', () => popup.remove());
    });
  };

  // Get route color for vehicle
  const getVehicleRouteColor = (vehicleId: string): string => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];
    const index = vehicleId.charCodeAt(vehicleId.length - 1) % colors.length;
    return colors[index];
  };

  // Generate routes for vehicles
  const generateRoutesForVehicles = async () => {
    if (!mapboxToken) return;

    clearRoutes();

    for (const vehicle of vehicles) {
      if (vehicle.lat && vehicle.lng && vehicle.packages.length > 0 && vehicle.status !== 'idle') {
        try {
          const startLocation: RouteWaypoint = {
            id: `start-${vehicle.vehicle_id}`,
            coordinates: [vehicle.lng, vehicle.lat],
            address: `${vehicle.driver}'s Current Location`
          };

          // Convert packages to waypoints
          const packageDestinations: RouteWaypoint[] = vehicle.packages.map((pkg, index) => ({
            id: pkg.id,
            coordinates: pkg.coordinates || [vehicle.lng + (index + 1) * 0.01, vehicle.lat + (index + 1) * 0.005],
            address: pkg.destination,
            packageId: pkg.id,
            estimatedTime: `${15 + index * 10} min`,
            isDelivered: pkg.status === 'delivered'
          }));

          const deliveryRoute = await createDeliveryRoute(
            vehicle.vehicle_id,
            startLocation,
            packageDestinations,
            mapboxToken
          );

          // Update vehicle with route
          setVehicles(prev => prev.map(v => 
            v.vehicle_id === vehicle.vehicle_id 
              ? { ...v, deliveryRoute }
              : v
          ));

          if (showRoutes) {
            addRouteToMap(deliveryRoute);
            addCheckpointsToMap(deliveryRoute);
          }

        } catch (error) {
          console.error(`Failed to create route for vehicle ${vehicle.vehicle_id}:`, error);
        }
      }
    }
  };

  // Location search function
  const searchLocation = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5&types=place,locality,neighborhood,address`
      );
      
      if (response.ok) {
        const data = await response.json();
        setLocationSuggestions(data.features || []);
        setShowLocationSuggestions(true);
      }
    } catch (error) {
      console.error('Location search failed:', error);
      setLocationSuggestions([]);
    }
  };

  // Add vehicle function
  const addVehicle = async () => {
    if (!newVehicle.id || !newVehicle.driver || !newVehicle.location) return;
    
    // Get coordinates for the location
    let coordinates = { lat: 37.7749, lng: -122.4194 }; // Default SF coords
    
    if (locationSuggestions.length > 0) {
      const [lng, lat] = locationSuggestions[0].center;
      coordinates = { lat, lng };
    }
    
    try {
      await apiAddVehicle({
        vehicle_id: newVehicle.id,
        driver: newVehicle.driver,
        lat: coordinates.lat,
        lon: coordinates.lng,
        status: 'idle',
        speed: 0,
        location: newVehicle.location
      });
      
      // Reset form
      setNewVehicle({ id: '', driver: '', location: '' });
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      
      // Reload vehicles
      const updatedVehicles = await getVehicles();
      setVehicles(updatedVehicles.map((v: any) => ({
        ...v,
        status: v.status === 'active' ? 'on-time' : v.status,
        packages: Array.isArray(v.packages) ? v.packages : [],
        progress: v.status === 'active' ? Math.floor(Math.random() * 100) : 0
      })));
      
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      alert(`Failed to add vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add package function
  const addPackageToVehicle = async () => {
    if (!newPackage.vehicleId || !newPackage.destination || !newPackage.weight) return;
    
    // Get coordinates for destination
    let packageCoordinates: [number, number] = [-122.4194, 37.7749]; // Default
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(newPackage.destination)}.json?access_token=${mapboxToken}&limit=1&types=place,locality,neighborhood,address`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          packageCoordinates = data.features[0].center;
        }
      }
    } catch (error) {
      console.error('Failed to geocode destination:', error);
    }
    
    try {
      // Add package using the new API
      await addPackage({
        destination: {
          address: newPackage.destination,
          lat: packageCoordinates[1],
          lng: packageCoordinates[0]
        },
        priority: "medium",
        status: "pending",
        estimatedDeliveryTime: new Date(Date.now() + 30 * 60000).toLocaleTimeString(),
        packageType: "General",
        vehicleId: newPackage.vehicleId
      });
      
      // Reset form
      setNewPackage({ vehicleId: '', destination: '', weight: 0 });
      
      // Reload vehicles to get updated packages
      const updatedVehicles = await getVehicles();
      setVehicles(updatedVehicles.map((v: any) => ({
        ...v,
        status: v.status === 'active' ? 'on-time' : v.status,
        packages: Array.isArray(v.packages) ? v.packages.map((p: any) => ({
          id: p.id,
          destination: p.destination?.address || p.destination,
          weight: newPackage.weight,
          status: p.status,
          coordinates: p.destination ? [p.destination.lng, p.destination.lat] : packageCoordinates
        })) : [],
        progress: v.status === 'active' ? Math.floor(Math.random() * 100) : 0
      })));
      
    } catch (error) {
      console.error('Failed to add package:', error);
      alert(`Failed to add package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Update map markers and routes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Add vehicle markers
    vehicles.forEach(vehicle => {
      if (vehicle.lat && vehicle.lng) {
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        el.innerHTML = `
          <div class="w-12 h-12 rounded-full border-3 border-white shadow-xl flex items-center justify-center text-white font-bold cursor-pointer transition-all hover:scale-110 ${
            vehicle.status === 'on-time' ? 'bg-emerald-500' :
            vehicle.status === 'delayed' ? 'bg-rose-500' :
            vehicle.status === 'active' ? 'bg-blue-500' : 'bg-slate-400'
          }">
            🚛
          </div>
        `;

        el.addEventListener('click', () => {
          setSelectedVehicle(vehicle);
          setShowVehicleDrawer(true);
        });

        // Enhanced popup with route info
        const routeInfo = vehicle.deliveryRoute ? `
          <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
          <div style="margin-bottom: 4px;">
            <strong>Route Distance:</strong> ${formatDistance(vehicle.deliveryRoute.distance || 0)}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Estimated Time:</strong> ${formatDuration(vehicle.deliveryRoute.duration || 0)}
          </div>
          <div>
            <strong>Deliveries:</strong> ${vehicle.packages.length} packages
          </div>
        ` : '';

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false
        }).setHTML(`
          <div style="padding: 12px; min-width: 250px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <strong>${vehicle.vehicle_id}</strong>
            </div>
            <div style="margin-bottom: 4px;"><strong>Driver:</strong> ${vehicle.driver}</div>
            <div style="margin-bottom: 4px;"><strong>Status:</strong> ${vehicle.status}</div>
            <div style="margin-bottom: 4px;"><strong>Speed:</strong> ${vehicle.speed} mph</div>
            <div><strong>Packages:</strong> ${vehicle.packages.length}</div>
            ${routeInfo}
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([vehicle.lng, vehicle.lat])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current[vehicle.vehicle_id] = marker;

        // Show popup on hover
        el.addEventListener('mouseenter', () => popup.addTo(map.current!));
        el.addEventListener('mouseleave', () => popup.remove());
      }
    });

    // Generate routes if enabled
    if (showRoutes) {
      generateRoutesForVehicles();
    }
  }, [vehicles, showRoutes]);

  // Toggle routes
  const toggleRoutes = () => {
    setShowRoutes(!showRoutes);
    if (!showRoutes) {
      generateRoutesForVehicles();
    } else {
      clearRoutes();
    }
  };

  // Close location suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.location-search-container')) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'text-emerald-600';
      case 'delayed': return 'text-rose-600';
      case 'active': return 'text-blue-600';
      default: return 'text-slate-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'on-time': return 'bg-emerald-50 border-emerald-200';
      case 'delayed': return 'bg-rose-50 border-rose-200';
      case 'active': return 'bg-blue-50 border-blue-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-50">
      {/* Mapbox Background - Full Screen */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* FleetLink Title */}
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  FleetLink
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <span className="text-sm text-slate-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="flex items-center space-x-2">
                {['fleet', 'add-vehicle', 'add-packages', 'routing', 'simulation'].map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeSection === section
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
                    }`}
                  >
                    {section === 'fleet' ? 'Fleet' : 
                     section === 'add-vehicle' ? 'Add Vehicle' :
                     section === 'add-packages' ? 'Add Packages' : 
                     section === 'routing' ? 'Routing' : 'Simulation'}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Vehicles:</span>
                  <span className="font-semibold text-slate-800">{vehicles.length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Packages:</span>
                  <span className="font-semibold text-slate-800">
                    {vehicles.reduce((sum, v) => sum + v.packages.length, 0)}
                  </span>
                </div>
                <button
                  onClick={toggleRoutes}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    showRoutes 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white/50 text-slate-600'
                  }`}
                >
                  {showRoutes ? 'Routes ON' : 'Routes OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of your existing content with the routing section added */}
      {/* Main Content Panel - Ultra Sleek Glass */}
      <div className={`absolute top-24 left-6 transition-all duration-500 ease-out ${
        isFleetPanelCollapsed ? 'w-16' : 'w-80'
      }`}>
        <div className="bg-white/30 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl shadow-black/10 h-[calc(100vh-8rem)]">
          {/* Collapse Button */}
          <div className="absolute -right-3 top-4 z-10">
            <button
              onClick={() => setIsFleetPanelCollapsed(!isFleetPanelCollapsed)}
              className="w-6 h-6 bg-white/80 backdrop-blur-xl border border-white/30 rounded-full shadow-lg flex items-center justify-center hover:bg-white/90 transition-all"
            >
              <div className="w-3 h-3 text-slate-600 text-xs">
                {isFleetPanelCollapsed ? '→' : '←'}
              </div>
            </button>
          </div>

          {!isFleetPanelCollapsed && (
            <div className="p-5 flex flex-col h-full">
              {/* Routing Section */}
              {activeSection === 'routing' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Route Management</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-white/40 backdrop-blur-xl rounded-lg p-4 border border-white/30">
                      <h4 className="font-medium text-slate-800 mb-2">Route Controls</h4>
                      <div className="space-y-3">
                        <button
                          onClick={toggleRoutes}
                          className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                            showRoutes 
                              ? 'bg-green-500 hover:bg-green-600 text-white' 
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          {showRoutes ? '🛑 Hide Routes' : '🗺️ Show Routes'}
                        </button>
                        
                        <button
                          onClick={generateRoutesForVehicles}
                          disabled={vehicles.length === 0}
                          className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          🚀 Optimize All Routes
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-xl rounded-lg p-4 border border-white/30">
                      <h4 className="font-medium text-slate-800 mb-3">Route Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Active Routes:</span>
                          <span className="text-slate-800 font-medium">
                            {vehicles.filter(v => v.deliveryRoute).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Waypoints:</span>
                          <span className="text-slate-800 font-medium">
                            {vehicles.reduce((sum, v) => sum + (v.deliveryRoute?.waypoints.length || 0), 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Avg Route Time:</span>
                          <span className="text-slate-800 font-medium">
                            {vehicles.filter(v => v.deliveryRoute).length > 0 
                              ? formatDuration(
                                  vehicles
                                    .filter(v => v.deliveryRoute)
                                    .reduce((sum, v) => sum + (v.deliveryRoute?.duration || 0), 0) / 
                                  vehicles.filter(v => v.deliveryRoute).length
                                )
                              : '--'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Routes List */}
                    <div className="flex-1 overflow-y-auto">
                      <h4 className="font-medium text-slate-800 mb-2">Vehicle Routes</h4>
                      <div className="space-y-2">
                        {vehicles.filter(v => v.deliveryRoute).map(vehicle => (
                          <div key={vehicle.vehicle_id} className="bg-white/30 backdrop-blur-xl rounded-lg p-3 border border-white/20">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium text-slate-800">{vehicle.vehicle_id}</div>
                              <div className="text-xs text-slate-600">
                                {vehicle.deliveryRoute?.waypoints.length} stops
                              </div>
                            </div>
                            <div className="text-xs text-slate-600">
                              <div>Distance: {formatDistance(vehicle.deliveryRoute?.distance || 0)}</div>
                              <div>Time: {formatDuration(vehicle.deliveryRoute?.duration || 0)}</div>
                            </div>
                          </div>
                        ))}
                        
                        {vehicles.filter(v => v.deliveryRoute).length === 0 && (
                          <div className="text-center py-4">
                            <div className="text-2xl mb-2">🗺️</div>
                            <div className="text-slate-600 text-sm">No routes generated</div>
                            <div className="text-slate-500 text-xs mt-1">Add packages and optimize routes</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Keep all your existing sections (fleet, add-vehicle, add-packages, simulation) */}
              {/* ... (rest of your existing content) */}
              
              {/* Your existing fleet section */}
              {activeSection === 'fleet' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Fleet Overview</h3>
                  
                  {vehicles.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-3">🚛</div>
                        <div className="text-slate-600 text-sm">No vehicles added yet</div>
                        <div className="text-slate-500 text-xs mt-1">Add a vehicle to get started</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {vehicles.map((vehicle) => (
                        <div
                          key={vehicle.vehicle_id}
                          className={`bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30 cursor-pointer transition-all hover:bg-white/50 hover:shadow-lg ${
                            selectedVehicle?.vehicle_id === vehicle.vehicle_id
                              ? 'ring-2 ring-blue-400 bg-white/60'
                              : ''
                          }`}
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setShowVehicleDrawer(true);
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold text-slate-800 text-base">{vehicle.vehicle_id}</div>
                              <div className="text-sm text-slate-600">{vehicle.driver}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${getStatusBg(vehicle.status)}`}>
                              <span className={getStatusColor(vehicle.status)}>{vehicle.status}</span>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Speed:</span>
                              <span className="text-slate-800 font-medium">{vehicle.speed} mph</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Packages:</span>
                              <span className="text-slate-800 font-medium">{vehicle.packages.length}</span>
                            </div>
                            
                            {vehicle.deliveryRoute && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Route:</span>
                                <span className="text-slate-800 font-medium text-xs">
                                  {formatDistance(vehicle.deliveryRoute.distance || 0)}
                                </span>
                              </div>
                            )}
                            
                            {vehicle.progress !== undefined && (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                  <span>Progress</span>
                                  <span>{vehicle.progress}%</span>
                                </div>
                                <div className="w-full bg-white/50 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${vehicle.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Your existing add-vehicle section */}
              {activeSection === 'add-vehicle' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Add New Vehicle</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle ID</label>
                      <input
                        type="text"
                        placeholder="e.g., TRUCK-003"
                        value={newVehicle.id}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, id: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Driver Name</label>
                      <input
                        type="text"
                        placeholder="Driver full name"
                        value={newVehicle.driver}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, driver: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <div className="relative location-search-container">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Starting Location</label>
                      <input
                        type="text"
                        placeholder="Search for location..."
                        value={newVehicle.location}
                        onChange={(e) => {
                          setNewVehicle(prev => ({ ...prev, location: e.target.value }));
                          searchLocation(e.target.value);
                        }}
                        onFocus={() => setShowLocationSuggestions(locationSuggestions.length > 0)}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                      
                      {/* Location Suggestions Dropdown */}
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {locationSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setNewVehicle(prev => ({ ...prev, location: suggestion.place_name }));
                                setShowLocationSuggestions(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                            >
                              {suggestion.place_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={addVehicle}
                      disabled={!newVehicle.id || !newVehicle.driver || !newVehicle.location}
                      className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                    >
                      Add Vehicle
                    </button>
                  </div>
                </>
              )}

              {/* Your existing add-packages section */}
              {activeSection === 'add-packages' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Package</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select Vehicle</label>
                      <select
                        value={newPackage.vehicleId}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, vehicleId: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      >
                        <option value="">Choose vehicle...</option>
                        {vehicles.map(v => (
                          <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_id} - {v.driver}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
                      <input
                        type="text"
                        placeholder="Package destination"
                        value={newPackage.destination}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, destination: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Weight (lbs)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newPackage.weight || ''}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={addPackageToVehicle}
                      disabled={!newPackage.vehicleId || !newPackage.destination || !newPackage.weight}
                      className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                    >
                      Add Package
                    </button>
                  </div>
                </>
              )}

              {/* Your existing simulation section */}
              {activeSection === 'simulation' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Fleet Simulation</h3>
                  <div className="space-y-4">
                    <div className="bg-white/40 backdrop-blur-xl rounded-lg p-4 border border-white/30">
                      <h4 className="font-medium text-slate-800 mb-2">Simulation Controls</h4>
                      <p className="text-sm text-slate-600 mb-4">
                        Start simulation to send vehicles on delivery routes. Vehicles will move to their package destinations automatically.
                      </p>
                      
                      <div className="space-y-3">
                        <button 
                          onClick={async () => {
                            try {
                              const response = await startSimulation();
                              console.log('Simulation started:', response.message);
                            } catch (error) {
                              console.error('Failed to start simulation:', error);
                            }
                          }}
                          disabled={vehicles.length === 0}
                          className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                        >
                          🚀 Start Simulation
                        </button>
                        
                        <button 
                          onClick={async () => {
                            try {
                              const response = await stopSimulation();
                              console.log('Simulation stopped:', response.message);
                            } catch (error) {
                              console.error('Failed to stop simulation:', error);
                            }
                          }}
                          className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                        >
                          ⏹️ Stop Simulation
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-xl rounded-lg p-4 border border-white/30">
                      <h4 className="font-medium text-slate-800 mb-2">Simulation Status</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Active Vehicles:</span>
                          <span className="text-slate-800 font-medium">
                            {vehicles.filter(v => v.status === 'active' || v.status === 'on-time').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Packages:</span>
                          <span className="text-slate-800 font-medium">
                            {vehicles.reduce((sum, v) => sum + v.packages.length, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">In Transit:</span>
                          <span className="text-slate-800 font-medium">
                            {vehicles.reduce((sum, v) => sum + v.packages.filter(p => p.status === 'in-transit').length, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">With Routes:</span>
                          <span className="text-slate-800 font-medium">
                            {vehicles.filter(v => v.deliveryRoute).length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {vehicles.length === 0 && (
                      <div className="text-center py-6">
                        <div className="text-4xl mb-3">🚛</div>
                        <div className="text-slate-600 text-sm">No vehicles available</div>
                        <div className="text-slate-500 text-xs mt-1">Add vehicles to start simulation</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Your existing Vehicle Details Drawer with route information added */}
      {showVehicleDrawer && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/10 backdrop-blur-sm"
            onClick={() => setShowVehicleDrawer(false)}
          />
          
          {/* Drawer */}
          <div className="w-96 bg-white/30 backdrop-blur-2xl border-l border-white/20 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800">{selectedVehicle.vehicle_id}</h2>
                <button
                  onClick={() => setShowVehicleDrawer(false)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <div className="w-4 h-4 text-slate-600">✕</div>
                </button>
              </div>
              
              <div className={`inline-flex px-3 py-1 rounded-lg border text-sm font-medium ${getStatusBg(selectedVehicle.status)}`}>
                <span className={getStatusColor(selectedVehicle.status)}>{selectedVehicle.status}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Live Info */}
              <div className="bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Live Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Driver:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Speed:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.speed} mph</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ETA:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.eta || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Next Stop:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.next_stop || 'Depot'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Last Updated:</span>
                    <span className="text-slate-800 font-medium">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Route Information - NEW */}
              {selectedVehicle.deliveryRoute && (
                <div className="bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Delivery Route</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Distance:</span>
                        <div className="font-medium text-slate-800">
                          {formatDistance(selectedVehicle.deliveryRoute.distance || 0)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Duration:</span>
                        <div className="font-medium text-slate-800">
                          {formatDuration(selectedVehicle.deliveryRoute.duration || 0)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-800">Waypoints:</div>
                      {selectedVehicle.deliveryRoute.waypoints.map((waypoint, index) => (
                        <div key={waypoint.id} className="flex items-center space-x-3 p-2 bg-white/30 rounded-lg">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                            waypoint.isDelivered ? 'bg-green-500' : 'bg-orange-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-800">{waypoint.address}</div>
                            <div className="text-xs text-slate-600">ETA: {waypoint.estimatedTime}</div>
                          </div>
                          {waypoint.isDelivered && (
                            <div className="text-green-500 text-xs">✓</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Packages */}
              <div className="bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                  Packages ({selectedVehicle.packages.length})
                </h3>
                {selectedVehicle.packages.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-2xl mb-2">📦</div>
                    <div className="text-slate-600 text-sm">No packages assigned</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedVehicle.packages.map((pkg) => (
                      <div key={pkg.id} className="flex justify-between items-center p-3 bg-white/30 backdrop-blur-xl rounded-lg border border-white/20">
                        <div>
                          <div className="text-slate-800 text-sm font-medium">{pkg.id}</div>
                          <div className="text-slate-600 text-xs">{pkg.destination}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-800 text-sm font-medium">{pkg.weight} lbs</div>
                          <div className={`text-xs font-medium ${
                            pkg.status === 'delivered' ? 'text-emerald-600' :
                            pkg.status === 'in-transit' ? 'text-blue-600' : 'text-amber-600'
                          }`}>
                            {pkg.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (selectedVehicle.packages.length > 0) {
                      generateRoutesForVehicles();
                    }
                  }}
                  disabled={selectedVehicle.packages.length === 0}
                  className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white rounded-lg transition-colors font-medium shadow-lg"
                >
                  🗺️ Generate Route
                </button>
                <button className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium shadow-lg">
                  Pause Vehicle
                </button>
                <button className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-lg">
                  Edit Route
                </button>
                <button className="w-full px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors font-medium shadow-lg">
                  Remove Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}