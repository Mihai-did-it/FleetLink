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
import { MapLocationPicker } from './components/common/MapLocationPicker'
import { QuickAddVehicleModal } from './components/modals/QuickAddVehicleModal'
import { QuickAddPackageModal } from './components/modals/QuickAddPackageModal'
import { useToast } from '@/hooks/use-toast'
import { DeliveryOrchestrator } from './systems/DeliveryOrchestrator'
import { Toaster } from '@/components/ui/toaster'

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
  const [activeSection, setActiveSection] = useState<'fleet' | 'add-vehicle' | 'add-packages'>('fleet');
  const [isConnected, setIsConnected] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true); // Default to ON - routes visible by default
  const [failedVehicles, setFailedVehicles] = useState<Set<string>>(new Set()); // Persistent failed vehicle tracking
  const [loading, setLoading] = useState(false);
  
  // New delivery orchestrator for waypoint-based deliveries
  const deliveryOrchestratorRef = useRef<DeliveryOrchestrator | null>(null);
  const [simulationStates, setSimulationStates] = useState<Map<string, any>>(new Map());
  const [simulationUpdateCounter, setSimulationUpdateCounter] = useState(0);
  
  // Toast notifications
  const { toast } = useToast();
  
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
  
  // Map location picker state
  const [isMapPickerActive, setIsMapPickerActive] = useState(false);
  const [mapPickerOnLocationSelect, setMapPickerOnLocationSelect] = useState<((location: { address: string; lat: number; lng: number }) => void) | null>(null);
  const [mapPickerMode, setMapPickerMode] = useState<'vehicle' | 'package' | 'general'>('general');
  const [mapPickerTitle, setMapPickerTitle] = useState<string>('Click on the map to select a location');
  
  // Quick add modals state
  const [showQuickAddVehicleModal, setShowQuickAddVehicleModal] = useState(false);
  const [showQuickAddPackageModal, setShowQuickAddPackageModal] = useState(false);
  const [quickAddSelectedLocation, setQuickAddSelectedLocation] = useState<{ address: string; lat: number; lng: number } | null>(null);
  
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

    // Add speed label layers when map loads
    map.current.on('load', () => {
      if (!map.current) return;
      
      // Initialize delivery orchestrator
      deliveryOrchestratorRef.current = new DeliveryOrchestrator(map.current);
      console.log('🎬 Delivery orchestrator initialized');
      
      // Add speed label source and layer for each vehicle
      vehicles.forEach(vehicle => {
        const speedLabelId = `speed-${vehicle.vehicle_id}`;
        
        if (!map.current!.getSource(speedLabelId)) {
          map.current!.addSource(speedLabelId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { speed: '0 km/h' },
              geometry: {
                type: 'Point',
                coordinates: [vehicle.lng || 0, vehicle.lat || 0]
              }
            }
          });

          map.current!.addLayer({
            id: speedLabelId,
            type: 'symbol',
            source: speedLabelId,
            layout: {
              'text-field': ['get', 'speed'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12,
              'text-offset': [0, -2],
              'text-anchor': 'bottom'
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1
            }
          });
        }
      });
    });

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

  // Initialize app
  useEffect(() => {
    loadVehiclesAndPackages();
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

  // Vehicle Simulation Functions
  const startVehicleSimulation = (vehicle: VehicleWithPackages) => {
    if (!vehicle.deliveryRoute?.route_geometry) {
      console.warn('No route geometry available for simulation');
      return;
    }

    const vehicleId = vehicle.vehicle_id;
    const routeCoordinates = vehicle.deliveryRoute.route_geometry.coordinates;
    
    console.log(`🚀 Starting waypoint-based simulation for ${vehicleId}`);
    
    // Start animation with new waypoint system
    animateVehicle(vehicleId, routeCoordinates, vehicle);
  };

  const stopVehicleSimulation = (vehicleId: string) => {
    console.log(`⏹️ Stopping simulation for ${vehicleId}`);
    
    // Stop delivery orchestrator
    if (deliveryOrchestratorRef.current) {
      deliveryOrchestratorRef.current.stopDeliverySimulation(vehicleId);
    }
    
    setSimulationStates(prev => {
      const newStates = new Map(prev);
      const vehicleState = newStates.get(vehicleId);
      
      if (vehicleState) {
        if (vehicleState.animationFrame) {
          cancelAnimationFrame(vehicleState.animationFrame);
        }
        
        const updatedState = {
          ...vehicleState,
          isActive: false,
          currentSpeed: 0
        };
        
        newStates.set(vehicleId, updatedState);
        
        // Hide speed label when stopped
        updateVehicleMarker(vehicleId, vehicleState.currentPosition, 0);
      }
      
      return newStates;
    });
  };

  const setSimulationSpeed = (vehicleId: string, fastForward: number) => {
    setSimulationStates(prev => {
      const newStates = new Map(prev);
      const vehicleState = newStates.get(vehicleId);
      
      if (vehicleState) {
        newStates.set(vehicleId, {
          ...vehicleState,
          fastForward
        });
      }
      
      return newStates;
    });
  };

  // TEST FUNCTION: Manually trigger delivery notifications for testing
  const testDeliveryNotifications = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
    if (!vehicle?.packages || vehicle.packages.length === 0) {
      toast({
        title: "❌ No packages to test",
        description: "Add packages to this vehicle first",
        duration: 3000,
      });
      return;
    }

    // Test with first package
    const testPackage = vehicle.packages[0];
    console.log(`🧪 TESTING delivery notification for package ${testPackage.package_id}`);
    
    toast({
      title: "🧪 TEST - Package Delivered!",
      description: `Vehicle ${vehicleId} delivered package to ${testPackage.destination}`,
      duration: 5000,
      className: "bg-green-50 border-green-200",
    });
    
    console.log(`✅ Test notification sent for ${testPackage.package_id}`);
  };

  const animateVehicle = (vehicleId: string, routeCoordinates: [number, number][], vehicle: VehicleWithPackages) => {
    if (!deliveryOrchestratorRef.current) {
      console.error('❌ Delivery orchestrator not initialized');
      return;
    }

    console.log(`🚀 Starting waypoint-based simulation for vehicle ${vehicleId}`);

    // Initialize delivery session with waypoints
    const deliverySession = deliveryOrchestratorRef.current.initializeDeliverySession(
      vehicle,
      routeCoordinates,
      routeCoordinates[0] // Start position
    );

    if (!deliverySession) {
      console.error(`❌ Failed to initialize delivery session for vehicle ${vehicleId}`);
      return;
    }

    // Start delivery simulation
    deliveryOrchestratorRef.current.startDeliverySimulation(vehicleId);

    // Initialize simulation state
    const initialState = {
      isActive: true,
      routeProgress: 0,
      currentPosition: routeCoordinates[0],
      currentSpeed: 0,
      deliveredPackages: [],
      lastUpdateTime: Date.now(),
      fastForward: 1,
      animationFrame: null as number | null
    };

    setSimulationStates(prev => new Map(prev).set(vehicleId, initialState));

    const updatePosition = () => {
      setSimulationStates(prev => {
        const currentStates = new Map(prev);
        const vehicleState = currentStates.get(vehicleId);
        
        if (!vehicleState || !vehicleState.isActive) return prev;

        const now = Date.now();
        const realDeltaTime = (now - (vehicleState.lastUpdateTime || now)) / 1000;
        const simulationDeltaTime = realDeltaTime * vehicleState.fastForward;
        
        // Realistic speed calculation
        const baseSpeed = 35; // mph
        const currentRealisticSpeed = getRealisticSpeed(vehicleState.routeProgress, baseSpeed);
        
        // Convert mph to km/s for distance calculation
        const speedKmH = currentRealisticSpeed * 1.60934;
        const distancePerSecond = speedKmH / 3600;
        
        // Calculate new position
        const totalDistance = calculateRouteDistance(routeCoordinates);
        const distanceToTravel = distancePerSecond * simulationDeltaTime;
        const progressIncrement = distanceToTravel / totalDistance;
        
        const newProgress = Math.min(vehicleState.routeProgress + progressIncrement, 1);
        const newPosition = interpolatePosition(routeCoordinates, newProgress);

        // Process delivery using orchestrator
        const deliveryResult = deliveryOrchestratorRef.current!.processDeliveryUpdate(
          vehicleId,
          newPosition,
          newProgress,
          currentRealisticSpeed
        );

        // Update simulation state
        const newState = {
          ...vehicleState,
          routeProgress: newProgress,
          currentPosition: deliveryResult.finalPosition || newPosition,
          currentSpeed: currentRealisticSpeed,
          deliveredPackages: deliveryOrchestratorRef.current!.getVehicleDeliveryState(vehicleId)?.deliveredPackages || [],
          lastUpdateTime: now
        };

        // Update vehicle marker
        updateVehicleMarker(vehicleId, newState.currentPosition, currentRealisticSpeed);
        
        // Check if complete
        if (deliveryResult.isComplete || newProgress >= 1) {
          console.log(`🏁 Route complete for ${vehicleId}`);
          
          newState.isActive = false;
          newState.currentSpeed = 0;
          newState.animationFrame = null;
          
          // Update final position if provided
          if (deliveryResult.finalPosition) {
            newState.currentPosition = deliveryResult.finalPosition;
            updateVehicleMarker(vehicleId, deliveryResult.finalPosition, 0);
            console.log(`📍 Vehicle ${vehicleId} final position set to:`, deliveryResult.finalPosition);
          }
        } else {
          // Continue animation
          newState.animationFrame = requestAnimationFrame(updatePosition);
        }

        // Create a completely new Map to ensure React detects the change
        const newStates = new Map(currentStates);
        newStates.set(vehicleId, newState);
        
        // Force a re-render by updating the counter
        setSimulationUpdateCounter(prev => prev + 1);
        
        return newStates;
      });
    };

    // Start animation
    requestAnimationFrame(updatePosition);
  };

  // Get realistic speed based on route progress (mph)
  const getRealisticSpeed = (progress: number, baseSpeed: number): number => {
    // Simulate realistic speed variations:
    // - Start slow (accelerating from stop)
    // - Vary speed based on route segment
    // - Slow down for turns and intersections
    
    if (progress < 0.05) {
      // Starting acceleration
      return baseSpeed * 0.3 + (baseSpeed * 0.7 * progress / 0.05);
    } else if (progress > 0.95) {
      // Slowing down to end
      return baseSpeed * (1 - (progress - 0.95) / 0.05 * 0.7);
    } else {
      // Normal driving with variation
      const variation = Math.sin(progress * Math.PI * 8) * 0.2; // Random-ish variation
      return baseSpeed + (baseSpeed * variation * 0.3);
    }
  };

  // COMPREHENSIVE DELIVERY SYSTEM - COMPLETELY REWRITTEN
  
  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistanceToDestination = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  // Validate that packages have coordinates
  const validatePackageCoordinates = (vehicle: VehicleWithPackages): Package[] => {
    const validPackages = vehicle.packages.filter(pkg => {
      const hasCoords = pkg.destination_lat && pkg.destination_lng && 
                       !isNaN(pkg.destination_lat) && !isNaN(pkg.destination_lng);
      
      if (!hasCoords) {
        console.warn(`⚠️ Package ${pkg.package_id} missing coordinates:`, {
          destination: pkg.destination,
          lat: pkg.destination_lat,
          lng: pkg.destination_lng
        });
      }
      
      return hasCoords;
    });
    
    if (validPackages.length !== vehicle.packages.length) {
      console.warn(`⚠️ Vehicle ${vehicle.vehicle_id}: ${vehicle.packages.length - validPackages.length} packages missing coordinates`);
    }
    
    return validPackages;
  };

  // Check if any packages should be delivered based on proximity to destination
  const checkPackageDeliveries = (vehicle: VehicleWithPackages, progress: number, currentPosition: [number, number], previouslyDelivered: string[] = []): string[] => {
    // Validate packages have coordinates
    const validPackages = validatePackageCoordinates(vehicle);
    if (validPackages.length === 0) {
      console.log(`🚚 Vehicle ${vehicle.vehicle_id}: No valid packages with coordinates`);
      return [];
    }
    
    const deliveredPackages: string[] = [];
    const DELIVERY_RADIUS_KM = 0.1; // 100 meters - more realistic for delivery range
    
    console.log(`🚚 DELIVERY CHECK - Vehicle ${vehicle.vehicle_id}:`, {
      progress: progress.toFixed(3),
      progressPercent: (progress * 100).toFixed(1) + '%',
      currentPosition: [currentPosition[1].toFixed(6), currentPosition[0].toFixed(6)], // [lat, lng]
      totalPackages: vehicle.packages.length,
      validPackages: validPackages.length,
      deliveryRadius: `${DELIVERY_RADIUS_KM * 1000}m`,
      previouslyDelivered: previouslyDelivered.length
    });
    
    // Check each valid package for proximity delivery
    for (const pkg of validPackages) {
      // Skip if already delivered
      if (previouslyDelivered.includes(pkg.package_id)) {
        continue;
      }
      
      // Calculate distance from current position to package destination
      const distance = calculateDistanceToDestination(
        currentPosition[1], currentPosition[0], // vehicle lat, lng
        pkg.destination_lat!, pkg.destination_lng! // package destination lat, lng (validated above)
      );
      
      const withinRadius = distance <= DELIVERY_RADIUS_KM;
      const progressOk = progress > 0.15; // 15% minimum progress
      
      console.log(`📍 Package ${pkg.package_id}:`, {
        destination: pkg.destination,
        coordinates: [pkg.destination_lat, pkg.destination_lng],
        distanceKm: distance.toFixed(4),
        distanceMeters: Math.round(distance * 1000),
        withinRadius,
        progressOk,
        canDeliver: withinRadius && progressOk
      });
      
      // Deliver if within tight radius AND we've made some progress
      if (withinRadius && progressOk) {
        deliveredPackages.push(pkg.package_id);
        console.log(`📦 ✅ DELIVERING Package ${pkg.package_id} - ${Math.round(distance * 1000)}m from destination`);
      }
    }
    
    if (deliveredPackages.length > 0) {
      console.log(`🎉 DELIVERY SUCCESS:`, {
        vehicle: vehicle.vehicle_id,
        delivered: deliveredPackages,
        count: deliveredPackages.length
      });
    } else {
      // Show closest undelivered package
      const undeliveredPackages = validPackages.filter(pkg => !previouslyDelivered.includes(pkg.package_id));
      if (undeliveredPackages.length > 0) {
        const distances = undeliveredPackages.map(pkg => ({
          package_id: pkg.package_id,
          destination: pkg.destination,
          distance: calculateDistanceToDestination(
            currentPosition[1], currentPosition[0],
            pkg.destination_lat!, pkg.destination_lng!
          )
        }));
        
        const closest = distances.reduce((min, curr) => curr.distance < min.distance ? curr : min);
        console.log(`⏳ Closest: ${closest.package_id} (${closest.destination}) - ${Math.round(closest.distance * 1000)}m away`);
      }
    }
    
    return deliveredPackages;
  };

  // FINAL DELIVERY CHECK at route completion - more lenient radius
  const performFinalDeliveryCheck = (vehicle: VehicleWithPackages, currentPosition: [number, number], previouslyDelivered: string[] = []): string[] => {
    const validPackages = validatePackageCoordinates(vehicle);
    if (validPackages.length === 0) return [];
    
    const deliveredPackages: string[] = [];
    const FINAL_DELIVERY_RADIUS_KM = 0.15; // 150 meters - more lenient for route completion
    
    console.log(`🏁 FINAL DELIVERY CHECK at route completion - Vehicle ${vehicle.vehicle_id}`);
    
    for (const pkg of validPackages) {
      if (previouslyDelivered.includes(pkg.package_id)) continue;
      
      const distance = calculateDistanceToDestination(
        currentPosition[1], currentPosition[0],
        pkg.destination_lat!, pkg.destination_lng!
      );
      
      console.log(`📍 FINAL CHECK Package ${pkg.package_id}:`, {
        destination: pkg.destination,
        distanceMeters: Math.round(distance * 1000),
        withinFinalRadius: distance <= FINAL_DELIVERY_RADIUS_KM,
        finalRadiusM: FINAL_DELIVERY_RADIUS_KM * 1000
      });
      
      if (distance <= FINAL_DELIVERY_RADIUS_KM) {
        deliveredPackages.push(pkg.package_id);
        console.log(`📦 🎯 FINAL DELIVERY: Package ${pkg.package_id} - ${Math.round(distance * 1000)}m (route completion)`);
        
        // Show delivery notification
        const packageInfo = pkg;
        toast({
          title: "📦 Package Delivered!",
          description: `Vehicle ${vehicle.vehicle_id} delivered package to ${packageInfo.destination}`,
          duration: 3000,
          className: "bg-green-50 border-green-200",
        });
      }
    }
    
    return deliveredPackages;
  };

  // Add temporary delivery animation on map
  const addDeliveryAnimation = (position: [number, number], destination: string) => {
    if (!map.current) return;
    
    // Create a temporary delivery marker
    const deliveryMarker = new mapboxgl.Marker({
      element: createDeliveryMarkerElement(),
      anchor: 'center'
    })
    .setLngLat(position)
    .addTo(map.current);
    
    // Remove the marker after 3 seconds
    setTimeout(() => {
      deliveryMarker.remove();
    }, 3000);
  };
  
  // Create delivery marker element
  const createDeliveryMarkerElement = () => {
    const el = document.createElement('div');
    el.className = 'delivery-animation';
    el.innerHTML = '📦';
    el.style.cssText = `
      font-size: 24px;
      animation: deliveryPulse 3s ease-in-out;
      pointer-events: none;
    `;
    
    // Add CSS animation if not already added
    if (!document.getElementById('delivery-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'delivery-animation-styles';
      style.textContent = `
        @keyframes deliveryPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    return el;
  };

  const updateVehicleMarker = (vehicleId: string, position: [number, number], speedMph: number) => {
    if (!map.current) return;

    const markerId = `vehicle-${vehicleId}`;
    const speedLabelId = `speed-${vehicleId}`;
    
    // Update vehicle position
    if (map.current.getSource(markerId)) {
      (map.current.getSource(markerId) as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { vehicleId, speed: Math.round(speedMph) },
        geometry: {
          type: 'Point',
          coordinates: position
        }
      });
    }

    // Update or create speed label (show speed only if > 0)
    const speedText = speedMph > 0 ? `${Math.round(speedMph)} mph` : '';
    
    if (map.current.getSource(speedLabelId)) {
      (map.current.getSource(speedLabelId) as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { speed: speedText },
        geometry: {
          type: 'Point',
          coordinates: position
        }
      });
    } else if (speedMph > 0) {
      // Create speed label if it doesn't exist and vehicle is moving
      map.current.addSource(speedLabelId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { speed: speedText },
          geometry: {
            type: 'Point',
            coordinates: position
          }
        }
      });

      map.current.addLayer({
        id: speedLabelId,
        type: 'symbol',
        source: speedLabelId,
        layout: {
          'text-field': ['get', 'speed'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-offset': [0, -2],
          'text-anchor': 'bottom'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      });
    }

    // Update the physical marker position too
    if (markers.current[vehicleId]) {
      markers.current[vehicleId].setLngLat(position);
    }
  };

  // Helper functions for simulation
  const calculateRouteDistance = (coordinates: [number, number][]): number => {
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      totalDistance += calculateDistance(coordinates[i-1], coordinates[i]);
    }
    return totalDistance;
  };

  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const R = 6371; // Earth's radius in kilometers
    
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  const interpolatePosition = (coordinates: [number, number][], progress: number): [number, number] => {
    if (progress <= 0) return coordinates[0];
    if (progress >= 1) return coordinates[coordinates.length - 1];
    
    const totalDistance = calculateRouteDistance(coordinates);
    const targetDistance = totalDistance * progress;
    
    let currentDistance = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
      const segmentDistance = calculateDistance(coordinates[i-1], coordinates[i]);
      
      if (currentDistance + segmentDistance >= targetDistance) {
        // Interpolate within this segment
        const segmentProgress = (targetDistance - currentDistance) / segmentDistance;
        const [lng1, lat1] = coordinates[i-1];
        const [lng2, lat2] = coordinates[i];
        
        return [
          lng1 + (lng2 - lng1) * segmentProgress,
          lat1 + (lat2 - lat1) * segmentProgress
        ];
      }
      
      currentDistance += segmentDistance;
    }
    
    return coordinates[coordinates.length - 1];
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
      console.log(`ℹ️ Vehicle ${vehicle.vehicle_id} has no packages - skipping route generation`);
      return;
    }

    // COMPREHENSIVE PACKAGE VALIDATION using consistent logic
    const validPackages = vehicle.packages.filter(pkg => 
      pkg.destination_lat && 
      pkg.destination_lng && 
      !isNaN(pkg.destination_lat) && 
      !isNaN(pkg.destination_lng)
    );
    if (validPackages.length === 0) {
      toast({
        title: "❌ Route Generation Failed",
        description: `Vehicle ${vehicle.vehicle_id} has no packages with valid coordinates`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (validPackages.length < vehicle.packages.length) {
      const invalidCount = vehicle.packages.length - validPackages.length;
      toast({
        title: "⚠️ Some Packages Invalid",
        description: `${invalidCount} packages missing coordinates will be skipped for vehicle ${vehicle.vehicle_id}`,
        className: "bg-orange-50 border-orange-200",
        duration: 4000,
      });
    }

    console.log(`🚀 Generating route for vehicle ${vehicle.vehicle_id}`, {
      vehicleCoords: [vehicle.lng, vehicle.lat],
      totalPackages: vehicle.packages.length,
      validPackages: validPackages.length,
      validPackageDetails: validPackages.map(p => ({
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

      // Use only valid packages for route generation
      const packageDestinations: RouteWaypoint[] = validPackages.map((pkg) => ({
        id: pkg.package_id,
        coordinates: [pkg.destination_lng!, pkg.destination_lat!], // Safe to use ! due to validation
        address: pkg.destination,
        packageId: pkg.package_id,
        estimatedTime: `${15 + validPackages.indexOf(pkg) * 10} min`,
        isDelivered: pkg.status === 'delivered'
      }));

      console.log(`📍 Creating route with ${packageDestinations.length} valid destinations`);

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

  // Handle map location picker toggle
  const handleMapPickerToggle = (
    active: boolean, 
    onLocationSelect?: (location: { address: string; lat: number; lng: number }) => void,
    mode: 'vehicle' | 'package' | 'general' = 'general',
    title: string = 'Click on the map to select a location'
  ) => {
    setIsMapPickerActive(active);
    setMapPickerOnLocationSelect(onLocationSelect ? () => onLocationSelect : null);
    setMapPickerMode(mode);
    setMapPickerTitle(title);
  };

  // Handle map picker location selection
  const handleMapPickerLocationSelect = (location: { address: string; lat: number; lng: number }) => {
    if (mapPickerOnLocationSelect) {
      mapPickerOnLocationSelect(location);
    }
    setIsMapPickerActive(false);
    setMapPickerOnLocationSelect(null);
    setMapPickerMode('general');
    setMapPickerTitle('Click on the map to select a location');
  };

  // Handle map picker cancel
  const handleMapPickerCancel = () => {
    setIsMapPickerActive(false);
    setMapPickerOnLocationSelect(null);
    setMapPickerMode('general');
    setMapPickerTitle('Click on the map to select a location');
  };

  // Quick add vehicle submission
  const handleQuickAddVehicle = async (vehicleData: {
    vehicle_id: string;
    driver: string;
    location: string;
    lat: number;
    lng: number;
  }) => {
    setLoading(true);
    try {
      const result = await addVehicle({
        vehicle_id: vehicleData.vehicle_id,
        driver: vehicleData.driver,
        lat: vehicleData.lat,
        lng: vehicleData.lng,
        location: vehicleData.location,
        status: 'idle',
        speed: 0
      });

      if (result) {
        toast({
          title: "✅ Vehicle Added Successfully!",
          description: `Vehicle ${vehicleData.vehicle_id} has been added at ${vehicleData.location}`,
          duration: 3000,
        });
        
        setShowQuickAddVehicleModal(false);
        setQuickAddSelectedLocation(null);
        await loadVehiclesAndPackages(); // Refresh data
      } else {
        throw new Error('Failed to add vehicle');
      }
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      toast({
        title: "❌ Failed to Add Vehicle",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick add package submission  
  const handleQuickAddPackage = async (packageData: {
    package_id: string;
    vehicle_id: string;
    destination: string;
    destination_lat: number;
    destination_lng: number;
    weight: number;
    priority: 'low' | 'medium' | 'high';
    recipient_name: string;
    package_type: string;
  }) => {
    setLoading(true);
    try {
      const result = await addPackage({
        package_id: packageData.package_id,
        vehicle_id: packageData.vehicle_id,
        destination: packageData.destination,
        destination_lat: packageData.destination_lat,
        destination_lng: packageData.destination_lng,
        weight: packageData.weight,
        priority: packageData.priority,
        recipient_name: packageData.recipient_name,
        package_type: packageData.package_type
      });

      if (result) {
        toast({
          title: "✅ Package Added Successfully!",
          description: `Package ${packageData.package_id} has been assigned to vehicle ${packageData.vehicle_id}`,
          duration: 3000,
        });
        
        setShowQuickAddPackageModal(false);
        setQuickAddSelectedLocation(null);
        await loadVehiclesAndPackages(); // Refresh data
      } else {
        throw new Error('Failed to add package');
      }
    } catch (error) {
      console.error('Failed to add package:', error);
      toast({
        title: "❌ Failed to Add Package",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
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
        <div className="bg-white/10 backdrop-blur-3xl border-b border-white/10 shadow-lg">
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
                {['fleet', 'add-vehicle', 'add-packages'].map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section as any)}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all backdrop-blur-sm border-2 ${
                      activeSection === section
                        ? 'bg-blue-600/90 text-white shadow-xl shadow-blue-500/30 border-blue-400/50 ring-2 ring-blue-400/20'
                        : 'text-white/90 hover:bg-white/20 hover:text-white border-white/30 hover:border-white/50 bg-white/10'
                    }`}
                  >
                    {section === 'fleet' ? '🚛 Fleet' : 
                     section === 'add-vehicle' ? '➕ Add Vehicle' : '📦 Add Packages'}
                  </button>
                ))}
              </div>

              {/* Stats and Quick Actions */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 bg-white/15 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                  <span className="text-white/80 font-medium">Vehicles:</span>
                  <span className="font-bold text-white text-lg shadow-lg">{vehicles.length}</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/15 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                  <span className="text-white/80 font-medium">Packages:</span>
                  <span className="font-bold text-white text-lg shadow-lg">{allPackages.length}</span>
                </div>
                
                {/* Quick Action Buttons */}
                <div className="flex items-center space-x-2 border-l border-white/20 pl-4">
                  <button
                    onClick={() => handleMapPickerToggle(
                      true, 
                      (location) => {
                        // Quick add vehicle mode - show modal after location selection
                        setQuickAddSelectedLocation(location);
                        setShowQuickAddVehicleModal(true);
                      },
                      'vehicle',
                      'Click on the map to add a vehicle at that location'
                    )}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600/60 text-blue-50 hover:bg-blue-600/80 transition-all flex items-center gap-2 shadow-xl border border-blue-400/40 backdrop-blur-sm ring-1 ring-blue-400/20"
                    title="Click map to add vehicle at that location"
                  >
                    <span className="text-base">🚛</span>
                    <span className="font-bold">Quick Add</span>
                  </button>
                  <button
                    onClick={() => {
                      if (vehicles.length === 0) {
                        toast({
                          title: "No vehicles available",
                          description: "Add a vehicle first before creating packages",
                          variant: "destructive"
                        });
                        return;
                      }
                      handleMapPickerToggle(
                        true, 
                        (location) => {
                          // Quick add package mode - show modal after location selection
                          setQuickAddSelectedLocation(location);
                          setShowQuickAddPackageModal(true);
                        },
                        'package',
                        'Click on the map to add a package delivery at that location'
                      );
                    }}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xl border backdrop-blur-sm ring-1 ${
                      vehicles.length === 0 
                        ? 'bg-gray-600/40 text-gray-300 border-gray-400/30 cursor-not-allowed ring-gray-400/10' 
                        : 'bg-orange-600/60 text-orange-50 hover:bg-orange-600/80 border-orange-400/40 ring-orange-400/20'
                    }`}
                    title={vehicles.length === 0 ? "Add vehicles first" : "Click map to add package delivery at that location"}
                    disabled={vehicles.length === 0}
                  >
                    <span className="text-base">📦</span>
                    <span className="font-bold">Quick Add</span>
                    {vehicles.length === 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-500/30 text-gray-200 rounded-full">
                        No vehicles
                      </span>
                    )}
                  </button>
                </div>
                
                <button
                  onClick={toggleRoutes}
                  className={`px-3 py-1 text-xs font-medium rounded-xl transition-all border backdrop-blur-sm ${
                    showRoutes 
                      ? 'bg-green-500/80 text-white border-green-400/30' 
                      : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                  }`}
                >
                  {showRoutes ? 'Routes ON' : 'Routes OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Removed delivery notification banner - using only toast notifications now */}
      </div>

      {/* Main Content Panel */}
      <div className={`absolute top-24 left-6 transition-all duration-500 ease-out ${
        isFleetPanelCollapsed ? 'w-16' : 
        (activeSection === 'add-vehicle' || activeSection === 'add-packages') ? 'w-96' : 'w-80'
      }`}>
        <div className="bg-white/20 backdrop-blur-3xl border border-white/30 rounded-2xl shadow-2xl shadow-black/20 h-[calc(100vh-8rem)]">
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
                  <div className="bg-white/20 backdrop-blur-xl rounded-xl p-4 border border-white/40 mb-4 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-1">🚛 Fleet Overview</h3>
                    <p className="text-white/70 text-sm">Monitor and control your vehicle fleet</p>
                  </div>
                  
                  {/* Route Toggle Button */}
                  <div className="mb-4">
                    <button
                      onClick={toggleRoutes}
                      className={`w-full px-4 py-2 rounded-xl transition-all text-sm font-medium backdrop-blur-sm border ${
                        showRoutes 
                          ? 'bg-green-500/80 hover:bg-green-500/90 text-white border-green-400/30 shadow-lg shadow-green-500/25' 
                          : 'bg-blue-500/80 hover:bg-blue-500/90 text-white border-blue-400/30 shadow-lg shadow-blue-500/25'
                      }`}
                    >
                      {showRoutes ? '🛑 Hide Routes' : '🗺️ Show Routes'}
                    </button>
                  </div>
                  
                  {vehicles.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center bg-white/30 backdrop-blur-xl rounded-xl p-6 border border-white/40">
                        <div className="text-4xl mb-3">🚛</div>
                        <div className="text-slate-700 text-sm font-medium">No vehicles added yet</div>
                        <div className="text-slate-600 text-xs mt-1">Click "Add Vehicle" to get started</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {vehicles.map((vehicle) => (
                        <div
                          key={`${vehicle.vehicle_id}-${simulationUpdateCounter}`}
                          className={`bg-white/50 backdrop-blur-xl rounded-xl p-4 border border-white/50 cursor-pointer transition-all hover:bg-white/70 hover:shadow-xl ${
                            selectedVehicle?.vehicle_id === vehicle.vehicle_id
                              ? 'ring-2 ring-blue-400 bg-white/70 shadow-xl'
                              : ''
                          }`}
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setShowVehicleDrawer(true);
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-bold text-slate-800 text-base">{vehicle.vehicle_id}</div>
                              <div className="text-sm text-slate-600 font-medium">{vehicle.driver}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${getStatusBg(vehicle.status)}`}>
                              <span className={getStatusColor(vehicle.status)}>{vehicle.status}</span>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Speed:</span>
                              <span className="text-slate-800 font-bold">{vehicle.speed} mph</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Packages:</span>
                              <span className="text-slate-800 font-bold">{vehicle.packages.length}</span>
                            </div>
                            
                            {vehicle.deliveryRoute && (
                              <div className="flex justify-between">
                                <span className="text-slate-600 font-medium">Route:</span>
                                <span className="text-slate-800 font-bold text-xs">
                                  {formatDistance(vehicle.deliveryRoute.total_distance || 0)}
                                </span>
                              </div>
                            )}
                            
                            {/* Show simulation progress if vehicle is being simulated */}
                            {simulationStates.get(vehicle.vehicle_id)?.isActive && (
                              <div className="mt-3 space-y-3">
                                {/* Route Progress */}
                                <div>
                                  <div className="flex justify-between text-xs text-slate-600 font-medium mb-1">
                                    <span>🗺️ Route Progress</span>
                                    <span>{Math.round((simulationStates.get(vehicle.vehicle_id)?.routeProgress || 0) * 100)}%</span>
                                  </div>
                                  <div className="w-full bg-white/50 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                      style={{ 
                                        width: `${(simulationStates.get(vehicle.vehicle_id)?.routeProgress || 0) * 100}%`,
                                        transform: `translateX(0)` // Force reflow
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                {/* Package Delivery Progress */}
                                <div>
                                  <div className="flex justify-between text-xs text-slate-600 font-medium mb-1">
                                    <span>📦 Packages Delivered</span>
                                    <span>{simulationStates.get(vehicle.vehicle_id)?.deliveredPackages?.length || 0} / {vehicle.packages?.length || 0}</span>
                                  </div>
                                  <div className="w-full bg-white/50 rounded-full h-2">
                                    <div
                                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                      style={{ 
                                        width: `${vehicle.packages?.length ? 
                                          ((simulationStates.get(vehicle.vehicle_id)?.deliveredPackages?.length || 0) / vehicle.packages.length) * 100 : 0}%`,
                                        transform: `translateX(0)` // Force reflow
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {vehicle.progress !== undefined && !simulationStates.get(vehicle.vehicle_id)?.isActive && (
                              <div className="mt-3 space-y-3">
                                {/* Static Route Progress */}
                                <div>
                                  <div className="flex justify-between text-xs text-slate-600 font-medium mb-1">
                                    <span>🗺️ Route Progress</span>
                                    <span>{vehicle.progress}%</span>
                                  </div>
                                  <div className="w-full bg-white/50 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${vehicle.progress}%` }}
                                    />
                                  </div>
                                </div>
                                
                                {/* Static Package Progress */}
                                {vehicle.packages && vehicle.packages.length > 0 && (
                                  <div>
                                    <div className="flex justify-between text-xs text-slate-600 font-medium mb-1">
                                      <span>📦 Package Status</span>
                                      <span>{vehicle.packages.filter(pkg => pkg.status === 'delivered').length} / {vehicle.packages.length}</span>
                                    </div>
                                    <div className="w-full bg-white/50 rounded-full h-2">
                                      <div
                                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                          width: `${(vehicle.packages.filter(pkg => pkg.status === 'delivered').length / vehicle.packages.length) * 100}%` 
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
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
                  onMapPickerToggle={handleMapPickerToggle}
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
                  onMapPickerToggle={handleMapPickerToggle}
                />
              )}

              {/* Removed Routing and Simulation tabs - functionality moved to Fleet Overview */}
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

              {/* Simulation Controls */}
              {selectedVehicle.deliveryRoute && (
                <div className="bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Route Simulation</h3>
                  
                  {simulationStates.get(selectedVehicle.vehicle_id)?.isActive ? (
                    <div className="space-y-3">
                      {/* Simulation Status */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-green-800 font-medium">🚛 Simulation Active</span>
                          <span className="text-green-600 text-sm">
                            {Math.round((simulationStates.get(selectedVehicle.vehicle_id)?.routeProgress || 0) * 100)}% Complete
                          </span>
                        </div>
                        <div className="text-sm text-green-700">
                          Speed: {Math.round(simulationStates.get(selectedVehicle.vehicle_id)?.currentSpeed || 0)} mph
                        </div>
                        <div className="text-sm text-green-700">
                          Packages Delivered: {simulationStates.get(selectedVehicle.vehicle_id)?.deliveredPackages?.length || 0} / {selectedVehicle.packages?.length || 0}
                        </div>
                      </div>

                      {/* Package Delivery Status */}
                      {selectedVehicle.packages && selectedVehicle.packages.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h4 className="text-blue-800 font-medium mb-2">📦 Package Status</h4>
                          <div className="space-y-1 text-sm">
                            {selectedVehicle.packages.map((pkg, index) => {
                              const isDelivered = simulationStates.get(selectedVehicle.vehicle_id)?.deliveredPackages?.includes(pkg.package_id);
                              return (
                                <div key={pkg.package_id} className="flex items-center justify-between">
                                  <span className="text-slate-700 truncate">{pkg.destination}</span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    isDelivered 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {isDelivered ? '✅ Delivered' : '🚚 In Transit'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Speed Controls */}
                      <div>
                        <div className="text-sm text-slate-600 mb-2">Simulation Speed:</div>
                        <div className="flex space-x-2">
                          {[1, 2, 4, 8].map(speed => (
                            <button
                              key={speed}
                              onClick={() => setSimulationSpeed(selectedVehicle.vehicle_id, speed)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                (simulationStates.get(selectedVehicle.vehicle_id)?.fastForward || 1) === speed
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Test Delivery Button */}
                      <div>
                        <button
                          onClick={() => testDeliveryNotifications(selectedVehicle.vehicle_id)}
                          className="w-full px-3 py-2 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition-colors"
                        >
                          🧪 Test Delivery Notification
                        </button>
                        <div className="text-xs text-slate-500 mt-1">Click to test if notifications work</div>
                      </div>

                      {/* Stop Button */}
                      <button
                        onClick={() => stopVehicleSimulation(selectedVehicle.vehicle_id)}
                        className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                      >
                        ⏹️ Stop Simulation
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-slate-600 text-center py-2">
                        Simulate vehicle movement along the delivery route
                      </div>
                      <button
                        onClick={() => startVehicleSimulation(selectedVehicle)}
                        className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                      >
                        🚀 Start Route Simulation
                      </button>
                    </div>
                  )}
                </div>
              )}

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
      
      {/* Map Location Picker */}
      <MapLocationPicker
        map={map.current}
        isActive={isMapPickerActive}
        onLocationSelect={handleMapPickerLocationSelect}
        onCancel={handleMapPickerCancel}
        mapboxToken={mapboxToken}
        mode={mapPickerMode}
        title={mapPickerTitle}
      />
      
      {/* Quick Add Modals */}
      {quickAddSelectedLocation && (
        <>
          <QuickAddVehicleModal
            isOpen={showQuickAddVehicleModal}
            onClose={() => {
              setShowQuickAddVehicleModal(false);
              setQuickAddSelectedLocation(null);
            }}
            selectedLocation={quickAddSelectedLocation}
            onSubmit={handleQuickAddVehicle}
            isLoading={loading}
          />
          
          <QuickAddPackageModal
            isOpen={showQuickAddPackageModal}
            onClose={() => {
              setShowQuickAddPackageModal(false);
              setQuickAddSelectedLocation(null);
            }}
            selectedLocation={quickAddSelectedLocation}
            vehicles={vehicles}
            onSubmit={handleQuickAddPackage}
            isLoading={loading}
          />
        </>
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
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}