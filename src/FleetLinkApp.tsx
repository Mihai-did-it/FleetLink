import { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'
import { 
  getVehicles,
  addVehicle,
  getPackages,
  getPackagesByVehicle,
  addPackage,
  startSimulation,
  stopSimulation,
  geocodeAddress,
  subscribeToVehicles,
  subscribeToPackages,
  saveDeliveryRoute,
  getDeliveryRoute,
  type Vehicle,
  type Package
} from './lib/local-api'
import { 
  createDeliveryRoute, 
  formatDuration, 
  formatDistance,
  type DeliveryRoute,
  type RouteWaypoint 
} from "./lib/routing"
import { type VehicleWithPackages } from './types'
import { AddVehicleTab } from './components/tabs/AddVehicleTab'
import { AddPackageTab } from './components/tabs/AddPackageTab'
import { RoutingTab } from './components/tabs/RoutingTab'
import { SimulationTab } from './components/tabs/SimulationTab'

// Types
interface NewVehicle {
  id: string;
  driver: string;
  location: string;
}

interface NewPackage {
  vehicleId: string;
  destination: string;
  weight: number;
  recipientName: string;
  packageType: string;
  priority: 'low' | 'medium' | 'high';
}

interface LocationSuggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export default function FleetLinkApp() {
  const [vehicles, setVehicles] = useState<VehicleWithPackages[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithPackages | null>(null);
  const [isFleetPanelCollapsed, setIsFleetPanelCollapsed] = useState(false);
  const [showVehicleDrawer, setShowVehicleDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState<'fleet' | 'add-vehicle' | 'add-packages' | 'simulation' | 'routing'>('fleet');
  const [isConnected, setIsConnected] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false); // Changed from true to false to prevent auto-generation
  const [failedVehicles, setFailedVehicles] = useState<Set<string>>(new Set()); // Persistent failed vehicle tracking
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newVehicle, setNewVehicle] = useState<NewVehicle>({ id: '', driver: '', location: '' });
  const [newPackage, setNewPackage] = useState<NewPackage>({ 
    vehicleId: '', 
    destination: '', 
    weight: 0,
    recipientName: '',
    packageType: '',
    priority: 'medium'
  });
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const routeLayerIds = useRef<string[]>([]);

  // Configuration
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibW5pZmFpIiwiYSI6ImNtZjM5dng3dzAxZWYybHEwdmZ2MmE4MDkifQ.CGxxP82dHH4tu6V9D6FhHg';

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 12,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Load vehicles and packages
  useEffect(() => {
    loadVehiclesAndPackages();
    
    // Add rate limiting to prevent infinite loops
    let lastVehicleUpdate = 0;
    let lastPackageUpdate = 0;
    const RATE_LIMIT_MS = 1000; // Max 1 update per second
    
    // Set up real-time subscriptions
    const vehicleSubscription = subscribeToVehicles(() => {
      const now = Date.now();
      if (now - lastVehicleUpdate > RATE_LIMIT_MS) {
        console.log('🔔 Vehicle subscription triggered, reloading data');
        lastVehicleUpdate = now;
        loadVehiclesAndPackages();
      } else {
        console.log('⚠️ Vehicle update rate limited');
      }
    });
    
    const packageSubscription = subscribeToPackages(() => {
      const now = Date.now();
      if (now - lastPackageUpdate > RATE_LIMIT_MS) {
        console.log('🔔 Package subscription triggered, reloading data');
        lastPackageUpdate = now;
        loadVehiclesAndPackages();
      } else {
        console.log('⚠️ Package update rate limited');
      }
    });

    return () => {
      vehicleSubscription.unsubscribe();
      packageSubscription.unsubscribe();
    };
  }, []);

  const loadVehiclesAndPackages = async () => {
    // Add infinite loop protection
    const callKey = `load-${Date.now()}`;
    console.log(`🔄 loadVehiclesAndPackages called [${callKey}]`);
    
    try {
      setLoading(true);
      const [vehiclesData, packagesData] = await Promise.all([
        getVehicles(),
        getPackages()
      ]);

      // Combine vehicles with their packages and routes
      const vehiclesWithPackages: VehicleWithPackages[] = await Promise.all(
        vehiclesData.map(async (vehicle) => {
          // Get existing route for this vehicle
          const existingRoute = await getDeliveryRoute(vehicle.vehicle_id);
          
          return {
            ...vehicle,
            packages: packagesData.filter(pkg => pkg.vehicle_id === vehicle.vehicle_id),
            deliveryRoute: existingRoute
          };
        })
      );

      setVehicles(vehiclesWithPackages);
      setAllPackages(packagesData);
      setIsConnected(true);
      
      console.log('✅ Loaded vehicles:', vehiclesWithPackages.length);
      console.log('✅ Loaded packages:', packagesData.length);
      
      // Display existing routes on the map if showRoutes is enabled
      if (showRoutes) {
        vehiclesWithPackages.forEach(vehicle => {
          if (vehicle.deliveryRoute) {
            console.log(`🗺️ Adding route for vehicle ${vehicle.vehicle_id}`);
            addRouteToMap(vehicle.deliveryRoute, vehicle.vehicle_id);
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Clear route layers
  const clearRoutes = () => {
    if (!map.current) return;
    
    routeLayerIds.current.forEach(layerId => {
      try {
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
        if (map.current!.getSource(layerId)) {
          map.current!.removeSource(layerId);
        }
      } catch (error) {
        console.warn('Error removing layer:', layerId, error);
      }
    });
    routeLayerIds.current = [];
  };

  // Add route to map - handles both routing.ts and database DeliveryRoute types
  const addRouteToMap = (deliveryRoute: any, vehicleId: string) => {
    console.log(`🗺️ addRouteToMap called for vehicle ${vehicleId}:`, {
      hasMap: !!map.current,
      deliveryRoute: deliveryRoute
    });
    
    // Handle both camelCase (routing.ts) and snake_case (database) properties
    const routeGeometry = deliveryRoute.routeGeometry || deliveryRoute.route_geometry;
    
    if (!map.current || !routeGeometry) {
      console.warn(`No route geometry found for vehicle ${vehicleId}:`, {
        hasMap: !!map.current,
        hasRouteGeometry: !!routeGeometry,
        deliveryRoute
      });
      return;
    }

    const routeId = `route-${vehicleId}`;
    const routeLineId = `route-line-${vehicleId}`;

    try {
      // Remove existing route if it exists
      if (map.current.getSource(routeId)) {
        map.current.removeLayer(routeLineId);
        map.current.removeSource(routeId);
      }

      map.current.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: routeGeometry
        }
      });

      map.current.addLayer({
        id: routeLineId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': getVehicleRouteColor(vehicleId),
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      routeLayerIds.current.push(routeLineId, routeId);
      console.log(`✅ Route successfully added to map for vehicle ${vehicleId}:`, {
        routeId,
        routeLineId,
        color: getVehicleRouteColor(vehicleId)
      });
    } catch (error) {
      console.error('Error adding route to map:', error);
    }
  };

  // Add checkpoints to map
  const addCheckpointsToMap = (deliveryRoute: DeliveryRoute) => {
    if (!map.current) return;

    deliveryRoute.waypoints.forEach((waypoint, index) => {
      const el = document.createElement('div');
      el.className = 'checkpoint-marker';
      el.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%; border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4); cursor: pointer;
        background-color: ${waypoint.isDelivered ? '#10B981' : '#F59E0B'};
        display: flex; align-items: center; justify-content: center;
        font-weight: bold; color: white; font-size: 12px; z-index: 100;
      `;
      el.textContent = (index + 1).toString();

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false
      }).setHTML(`
        <div style="padding: 12px; min-width: 200px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <div style="background: ${waypoint.isDelivered ? '#10B981' : '#F59E0B'}; 
                        width: 12px; height: 12px; border-radius: 50%; margin-right: 8px;"></div>
            <strong>Stop ${index + 1}</strong>
          </div>
          <div style="margin-bottom: 4px;"><strong>Address:</strong> ${waypoint.address}</div>
          <div style="margin-bottom: 4px;"><strong>Package:</strong> ${waypoint.packageId || 'N/A'}</div>
          <div style="margin-bottom: 4px;"><strong>ETA:</strong> ${waypoint.estimatedTime || 'Calculating...'}</div>
          <div>
            <strong>Status:</strong> 
            <span style="color: ${waypoint.isDelivered ? '#10B981' : '#F59E0B'};">
              ${waypoint.isDelivered ? 'Delivered' : 'Pending'}
            </span>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(waypoint.coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      markers.current[`checkpoint-${waypoint.id}`] = marker;

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

  // Generate route for a specific vehicle
  const generateRouteForVehicle = async (vehicle: VehicleWithPackages) => {
    console.log('🎯 generateRouteForVehicle called with vehicle:', vehicle)
    
    if (!mapboxToken) {
      console.error('❌ MapBox token not available');
      return;
    }

    if (!vehicle.lat || !vehicle.lng) {
      console.error(`❌ Vehicle ${vehicle.vehicle_id} has no coordinates:`, {
        lat: vehicle.lat,
        lng: vehicle.lng
      });
      return;
    }

    if (vehicle.packages.length === 0) {
      console.error(`❌ Vehicle ${vehicle.vehicle_id} has no packages:`, vehicle.packages);
      return;
    }

    console.log(`🚀 Generating route for vehicle ${vehicle.vehicle_id}`, {
      vehicleCoords: [vehicle.lng, vehicle.lat],
      packageCount: vehicle.packages.length,
      packages: vehicle.packages.map(p => ({
        id: p.package_id,
        dest: p.destination,
        coords: [p.destination_lng, p.destination_lat]
      }))
    });
    setLoading(true);

    try {
      const startLocation: RouteWaypoint = {
        id: `start-${vehicle.vehicle_id}`,
        coordinates: [vehicle.lng, vehicle.lat],
        address: `${vehicle.driver}'s Location`
      };

      const packageDestinations: RouteWaypoint[] = vehicle.packages.map((pkg) => ({
        id: pkg.package_id,
        coordinates: [pkg.destination_lng, pkg.destination_lat],
        address: pkg.destination,
        packageId: pkg.package_id,
        estimatedTime: `${15 + vehicle.packages.indexOf(pkg) * 10} min`,
        isDelivered: pkg.status === 'delivered'
      }));

      console.log(`📍 Creating route with ${packageDestinations.length} destinations`);

      const deliveryRoute = await createDeliveryRoute(
        vehicle.vehicle_id,
        startLocation,
        packageDestinations,
        mapboxToken
      );

      console.log(`✅ Route created successfully:`, {
        distance: deliveryRoute.distance,
        duration: deliveryRoute.duration,
        hasGeometry: !!deliveryRoute.routeGeometry
      });

      // Save route to database
      const savedRoute = await saveDeliveryRoute({
        vehicle_id: vehicle.vehicle_id,
        route_geometry: deliveryRoute.routeGeometry,
        total_distance: deliveryRoute.distance || 0,
        total_duration: deliveryRoute.duration || 0,
        waypoints: deliveryRoute.waypoints
      });

      // Update local state with the saved route
      if (savedRoute) {
        setVehicles(prev => prev.map(v => 
          v.vehicle_id === vehicle.vehicle_id 
            ? { ...v, deliveryRoute: savedRoute }
            : v
        ));

        // Update selected vehicle if it's the same
        if (selectedVehicle?.vehicle_id === vehicle.vehicle_id) {
          setSelectedVehicle({ ...vehicle, deliveryRoute: savedRoute });
        }
      }

      // Add route to map
      addRouteToMap(deliveryRoute, vehicle.vehicle_id);
      addCheckpointsToMap(deliveryRoute);

      console.log(`🗺️ Route displayed on map for ${vehicle.vehicle_id}`);

    } catch (error) {
      console.error(`❌ Failed to create route for ${vehicle.vehicle_id}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Generate routes for vehicles
  const generateRoutesForVehicles = async (source = 'manual') => {
    if (!mapboxToken) {
      console.error('❌ MapBox token not available');
      return;
    }

    const callKey = `routes-${Date.now()}`;
    console.log(`🚀 Starting route generation... [${callKey}] Source: ${source}`);
    
    if (loading) {
      console.log('⚠️ Already loading, skipping route generation');
      return;
    }
    
    setLoading(true);
    clearRoutes();

    // Use persistent failed vehicle tracking

    try {
      for (const vehicle of vehicles) {
        // Skip vehicles that have already failed in this session
        if (failedVehicles.has(vehicle.vehicle_id)) {
          console.log(`⚠️ Skipping previously failed vehicle: ${vehicle.vehicle_id}`);
          continue;
        }

        // Check if vehicle has coordinates and packages (removed status check)
        if (vehicle.lat && vehicle.lng && vehicle.packages.length > 0) {
          console.log(`🗺️ Generating route for vehicle ${vehicle.vehicle_id} with ${vehicle.packages.length} packages`);
          
          try {
            const startLocation: RouteWaypoint = {
              id: `start-${vehicle.vehicle_id}`,
              coordinates: [vehicle.lng, vehicle.lat],
              address: `${vehicle.driver}'s Location`
            };

            const packageDestinations: RouteWaypoint[] = vehicle.packages.map((pkg) => ({
              id: pkg.package_id,
              coordinates: [pkg.destination_lng, pkg.destination_lat],
              address: pkg.destination,
              packageId: pkg.package_id,
              estimatedTime: `${15 + vehicle.packages.indexOf(pkg) * 10} min`,
              isDelivered: pkg.status === 'delivered'
            }));

            console.log(`📍 Route waypoints:`, {
              start: startLocation,
              destinations: packageDestinations.length
            });

            const deliveryRoute = await createDeliveryRoute(
              vehicle.vehicle_id,
              startLocation,
              packageDestinations,
              mapboxToken
            );

            console.log(`✅ Route created for ${vehicle.vehicle_id}:`, {
              distance: deliveryRoute.distance,
              duration: deliveryRoute.duration,
              hasGeometry: !!deliveryRoute.routeGeometry
            });

            // Save route to database
            const savedRoute = await saveDeliveryRoute({
              vehicle_id: vehicle.vehicle_id,
              route_geometry: deliveryRoute.routeGeometry,
              total_distance: deliveryRoute.distance || 0,
              total_duration: deliveryRoute.duration || 0,
              waypoints: deliveryRoute.waypoints
            });

            // Update local state with the saved route
            if (savedRoute) {
              setVehicles(prev => prev.map(v => 
                v.vehicle_id === vehicle.vehicle_id 
                  ? { ...v, deliveryRoute: savedRoute }
                  : v
              ));
            }

            // Always add routes to map when generated (showRoutes will be enabled after generation)
            console.log(`🗺️ Adding route to map for vehicle ${vehicle.vehicle_id}:`, {
              hasGeometry: !!deliveryRoute.routeGeometry,
              geometryType: deliveryRoute.routeGeometry?.type,
              coordinatesLength: deliveryRoute.routeGeometry?.coordinates?.length
            });
            addRouteToMap(deliveryRoute, vehicle.vehicle_id);
            addCheckpointsToMap(deliveryRoute);

          } catch (error) {
            console.error(`❌ Failed to create route for ${vehicle.vehicle_id}:`, error);
            setFailedVehicles(prev => new Set([...prev, vehicle.vehicle_id])); // Mark as failed persistently
          }
        } else {
          console.log(`⚠️ Skipping vehicle ${vehicle.vehicle_id}:`, {
            hasCoordinates: !!(vehicle.lat && vehicle.lng),
            packageCount: vehicle.packages.length,
            reason: !vehicle.lat || !vehicle.lng ? 'No coordinates' : 'No packages'
          });
        }
      }
      
      console.log('✅ Route generation completed');
      
      // Automatically enable route display when routes are generated
      if (!showRoutes) {
        console.log('🗺️ Auto-enabling route display after successful generation');
        setShowRoutes(true);
      }
    } catch (error) {
      console.error('❌ Route generation failed:', error);
    } finally {
      setLoading(false);
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
  const handleAddVehicle = async () => {
    if (!newVehicle.id || !newVehicle.driver || !newVehicle.location) {
      alert('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      // Get coordinates for the location
      const coordinates = await geocodeAddress(newVehicle.location, mapboxToken);
      
      if (!coordinates) {
        alert('Could not find coordinates for that location');
        return;
      }

      const result = await addVehicle({
        vehicle_id: newVehicle.id,
        driver: newVehicle.driver,
        lat: coordinates.lat,
        lng: coordinates.lng,
        location: newVehicle.location,
        status: 'idle',
        speed: 0
      });

      if (result) {
        console.log('✅ Vehicle added successfully:', result);
        setNewVehicle({ id: '', driver: '', location: '' });
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
        // Data will refresh automatically via subscription
        alert('Vehicle added successfully!');
      } else {
        alert('Failed to add vehicle');
      }
    } catch (error) {
      console.error('❌ Failed to add vehicle:', error);
      alert('Failed to add vehicle: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Add package function
  const handleAddPackage = async () => {
    if (!newPackage.vehicleId || !newPackage.destination || !newPackage.weight || !newPackage.recipientName) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      // Get coordinates for destination
      const coordinates = await geocodeAddress(newPackage.destination, mapboxToken);
      
      if (!coordinates) {
        alert('Could not find coordinates for that destination');
        return;
      }

      const packageId = `PKG-${Date.now()}`;
      
      const result = await addPackage({
        package_id: packageId,
        vehicle_id: newPackage.vehicleId,
        destination: newPackage.destination,
        destination_lat: coordinates.lat,
        destination_lng: coordinates.lng,
        weight: newPackage.weight,
        priority: newPackage.priority,
        recipient_name: newPackage.recipientName,
        package_type: newPackage.packageType
      });

      if (result) {
        console.log('✅ Package added successfully:', result);
        setNewPackage({ 
          vehicleId: '', 
          destination: '', 
          weight: 0,
          recipientName: '',
          packageType: '',
          priority: 'medium'
        });
        // Data will refresh automatically via subscription
        alert('Package added successfully!');
      } else {
        alert('Failed to add package');
      }
    } catch (error) {
      console.error('❌ Failed to add package:', error);
      alert('Failed to add package: ' + (error as Error).message);
    } finally {
      setLoading(false);
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

        const routeInfo = vehicle.deliveryRoute ? `
          <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
          <div style="margin-bottom: 4px;">
            <strong>Route Distance:</strong> ${formatDistance(vehicle.deliveryRoute.total_distance || 0)}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Estimated Time:</strong> ${formatDuration(vehicle.deliveryRoute.total_duration || 0)}
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

        el.addEventListener('mouseenter', () => popup.addTo(map.current!));
        el.addEventListener('mouseleave', () => popup.remove());
      }
    });

    // Note: Removed automatic route generation from useEffect to prevent infinite loops
    // Routes are now generated manually via toggleRoutes() or clicking "Generate Route" buttons
  }, [showRoutes]); // Removed 'vehicles' dependency to prevent infinite loop

  // Separate useEffect for vehicle markers - this needs vehicles dependency!
  useEffect(() => {
    if (!map.current) return;

    console.log('🗺️ Updating vehicle markers on map, vehicle count:', vehicles.length);

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Add vehicle markers
    vehicles.forEach(vehicle => {
      if (vehicle.lat && vehicle.lng) {
        console.log('📍 Adding vehicle marker for:', vehicle.vehicle_id, [vehicle.lng, vehicle.lat]);
        
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

        const routeInfo = vehicle.deliveryRoute ? `
          <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
          <div style="margin-bottom: 4px;">
            <strong>Route Distance:</strong> ${formatDistance(vehicle.deliveryRoute.total_distance || 0)}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Estimated Time:</strong> ${formatDuration(vehicle.deliveryRoute.total_duration || 0)}
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
            <div style="margin-bottom: 4px;"><strong>Location:</strong> ${vehicle.location}</div>
            <div><strong>Packages:</strong> ${vehicle.packages.length}</div>
            ${routeInfo}
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([vehicle.lng, vehicle.lat])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current[vehicle.vehicle_id] = marker;

        el.addEventListener('mouseenter', () => popup.addTo(map.current!));
        el.addEventListener('mouseleave', () => popup.remove());
      } else {
        console.log('⚠️ Vehicle missing coordinates:', vehicle.vehicle_id, { lat: vehicle.lat, lng: vehicle.lng });
      }
    });
  }, [vehicles]); // Vehicle markers update when vehicles change

  // Clear failed vehicles
  const clearFailedVehicles = () => {
    console.log('🧹 Clearing failed vehicles list');
    setFailedVehicles(new Set());
  };

  // Toggle routes
  const toggleRoutes = () => {
    console.log('🔄 toggleRoutes called, current showRoutes:', showRoutes);
    setShowRoutes(!showRoutes);
    if (!showRoutes) {
      console.log('🚀 toggleRoutes: Enabling routes, calling generateRoutesForVehicles');
      generateRoutesForVehicles('toggle-routes');
    } else {
      console.log('🧹 toggleRoutes: Disabling routes, calling clearRoutes');
      clearRoutes();
    }
  };

  // Handle simulation
  const handleStartSimulation = async () => {
    setLoading(true);
    try {
      const result = await startSimulation();
      if (result.success) {
        alert('Simulation started successfully!');
      } else {
        alert('Failed to start simulation: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Simulation start failed:', error);
      alert('Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleStopSimulation = async () => {
    setLoading(true);
    try {
      const result = await stopSimulation();
      if (result.success) {
        alert('Simulation stopped successfully!');
      } else {
        alert('Failed to stop simulation: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Simulation stop failed:', error);
      alert('Failed to stop simulation');
    } finally {
      setLoading(false);
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

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-700 font-medium">Processing...</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* FleetLink Title */}
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  FleetLink Pro
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <span className="text-sm text-slate-600">{isConnected ? 'Supabase Connected' : 'Disconnected'}</span>
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
                  <span className="font-semibold text-slate-800">{allPackages.length}</span>
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

      {/* Main Content Panel */}
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
              {/* Fleet Section */}
              {activeSection === 'fleet' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Fleet Overview</h3>
                  
                  {vehicles.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-3">🚛</div>
                        <div className="text-slate-600 text-sm">No vehicles added yet</div>
                        <div className="text-slate-500 text-xs mt-1">Click "Add Vehicle" to get started</div>
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
                                  {formatDistance(vehicle.deliveryRoute.total_distance || 0)}
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

              {/* Add Vehicle Section */}
              {activeSection === 'add-vehicle' && (
                <AddVehicleTab 
                  mapboxToken={mapboxToken}
                  onVehicleAdded={() => {
                    loadVehiclesAndPackages()
                    setActiveSection('fleet')
                  }}
                />
              )}

              {/* Add Package Section */}
              {activeSection === 'add-packages' && (
                <AddPackageTab
                  mapboxToken={mapboxToken}
                  vehicles={vehicles}
                  onPackageAdded={() => {
                    loadVehiclesAndPackages()
                    setActiveSection('fleet')
                  }}
                />
              )}

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
                          onClick={() => generateRoutesForVehicles('manual-button')}
                          disabled={vehicles.length === 0 || loading}
                          className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          {loading ? 'Optimizing...' : '🚀 Optimize All Routes'}
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
                          <span className="text-slate-600">Total Packages:</span>
                          <span className="text-slate-800 font-medium">{allPackages.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Pending Deliveries:</span>
                          <span className="text-slate-800 font-medium">
                            {allPackages.filter(p => p.status === 'pending').length}
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
                                {vehicle.packages.length} stops
                              </div>
                            </div>
                            <div className="text-xs text-slate-600">
                              <div>Distance: {formatDistance(vehicle.deliveryRoute?.total_distance || 0)}</div>
                              <div>Time: {formatDuration(vehicle.deliveryRoute?.total_duration || 0)}</div>
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

              {/* Simulation Section */}
              {activeSection === 'simulation' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Fleet Simulation</h3>
                  <div className="space-y-4">
                    <div className="bg-white/40 backdrop-blur-xl rounded-lg p-4 border border-white/30">
                      <h4 className="font-medium text-slate-800 mb-2">Simulation Controls</h4>
                      <p className="text-sm text-slate-600 mb-4">
                        Start simulation to activate delivery routes. Vehicles will update their status automatically.
                      </p>
                      
                      <div className="space-y-3">
                        <button 
                          onClick={handleStartSimulation}
                          disabled={vehicles.length === 0 || loading}
                          className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                        >
                          {loading ? 'Starting...' : '🚀 Start Simulation'}
                        </button>
                        
                        <button 
                          onClick={handleStopSimulation}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                        >
                          {loading ? 'Stopping...' : '⏹️ Stop Simulation'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-xl rounded-lg p-4 border border-white/30">
                      <h4 className="font-medium text-slate-800 mb-2">Simulation Status</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Active Vehicles:</span>
                          <span className="text-slate-800 font-medium">
                            {vehicles.filter(v => v.status === 'active').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Packages:</span>
                          <span className="text-slate-800 font-medium">{allPackages.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">In Transit:</span>
                          <span className="text-slate-800 font-medium">
                            {allPackages.filter(p => p.status === 'in-transit').length}
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

      {/* Vehicle Details Drawer */}
      {showVehicleDrawer && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/10 backdrop-blur-sm"
            onClick={() => setShowVehicleDrawer(false)}
          />
          
          <div className="w-96 bg-white/30 backdrop-blur-2xl border-l border-white/20 shadow-2xl overflow-y-auto">
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

            <div className="p-6 space-y-6">
              <div className="bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Vehicle Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Driver:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Location:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Speed:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.speed} mph</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span className={`font-medium ${getStatusColor(selectedVehicle.status)}`}>
                      {selectedVehicle.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedVehicle.deliveryRoute && (
                <div className="bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Delivery Route</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Distance:</span>
                        <div className="font-medium text-slate-800">
                          {formatDistance(selectedVehicle.deliveryRoute.total_distance || 0)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Duration:</span>
                        <div className="font-medium text-slate-800">
                          {formatDuration(selectedVehicle.deliveryRoute.total_duration || 0)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-800">Delivery Stops:</div>
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
                      <div key={pkg.package_id} className="p-3 bg-white/30 backdrop-blur-xl rounded-lg border border-white/20">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-slate-800 text-sm font-medium">{pkg.package_id}</div>
                            <div className="text-slate-600 text-xs">{pkg.destination}</div>
                            <div className="text-slate-600 text-xs">To: {pkg.recipient_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-800 text-sm font-medium">{pkg.weight} lbs</div>
                            <div className={`text-xs font-medium px-2 py-1 rounded ${
                              pkg.status === 'delivered' ? 'bg-green-100 text-green-700' :
                              pkg.status === 'in-transit' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {pkg.status}
                            </div>
                          </div>
                        </div>
                        {pkg.package_type && (
                          <div className="text-xs text-slate-500">Type: {pkg.package_type}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    console.log('🔵 Route button clicked for vehicle:', selectedVehicle.vehicle_id)
                    generateRouteForVehicle(selectedVehicle)
                  }}
                  disabled={selectedVehicle.packages.length === 0 || loading}
                  className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white rounded-lg transition-colors font-medium shadow-lg"
                >
                  {loading ? '� Generating...' : '�🗺️ Generate Route'}
                </button>
                
                {selectedVehicle.packages.length === 0 && (
                  <p className="text-sm text-slate-500 text-center">
                    Add packages to this vehicle before generating routes
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Local Testing Indicator */}
      <div className="fixed bottom-4 left-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium z-50">
        🧪 Local Testing Mode
      </div>

      {/* Debug Info */}
      <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-xs z-50 max-w-xs">
        <div>Vehicles: {vehicles.length}</div>
        <div>With Packages: {vehicles.filter(v => v.packages.length > 0).length}</div>
        <div>With Routes: {vehicles.filter(v => v.deliveryRoute).length}</div>
        <div>MapBox Token: {mapboxToken ? '✅' : '❌'}</div>
      </div>
    </div>
  )
}