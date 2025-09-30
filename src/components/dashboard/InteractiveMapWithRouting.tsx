import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, RefreshCw, Layers, Settings, Route, Package, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getVehicles, Vehicle as ApiVehicle } from "@/lib/api";
import { 
  createDeliveryRoute, 
  generateMockPackageDestinations, 
  formatDuration, 
  formatDistance,
  type DeliveryRoute,
  type RouteWaypoint 
} from "@/lib/routing";

interface Vehicle {
  id: string;
  lat: number;
  lng: number;
  driver: string;
  status: 'active' | 'idle' | 'warning';
  heading: number;
}

export function InteractiveMapWithRouting() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken] = useState(import.meta.env.VITE_MAPBOX_TOKEN || '');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [deliveryRoutes, setDeliveryRoutes] = useState<DeliveryRoute[]>([]);
  const { toast } = useToast();

  // Store markers and route layers
  const markers = useRef<mapboxgl.Marker[]>([]);
  const routeLayerIds = useRef<string[]>([]);

  // Load vehicles from API
  useEffect(() => {
    if (mapboxToken) {
      initializeMap();
    }
    loadVehicles();
    
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(loadVehicles, 10000);
    return () => clearInterval(interval);
  }, [mapboxToken]);

  const loadVehicles = async () => {
    try {
      const apiVehicles = await getVehicles();
      
      // Transform API vehicles to map format with fallback coordinates
      const transformedVehicles: Vehicle[] = apiVehicles.map((vehicle, index) => ({
        id: vehicle.vehicle_id,
        lat: vehicle.lat || (37.7749 + (index * 0.01)), // Default to SF area with offset
        lng: vehicle.lon || (-122.4194 + (index * 0.01)),
        driver: vehicle.driver || "Unknown Driver",
        status: (vehicle.status as 'active' | 'idle' | 'warning') || 'idle',
        heading: Math.random() * 360 // Random heading if not provided
      }));
      
      setVehicles(transformedVehicles);
      
      // Update map markers and routes if map is initialized
      if (isMapInitialized && map.current) {
        clearMarkers();
        clearRoutes();
        addVehicleMarkers(transformedVehicles);
        
        if (showRoutes) {
          generateAndDisplayRoutes(transformedVehicles);
        }
      }
    } catch (error) {
      console.error("Failed to load vehicles for map:", error);
      // Use fallback data
      const fallbackVehicles = [
        { id: 'TRUCK-001', lat: 37.7749, lng: -122.4194, driver: 'Mike Johnson', status: 'active' as const, heading: 45 },
        { id: 'TRUCK-002', lat: 37.7849, lng: -122.4094, driver: 'Sarah Chen', status: 'active' as const, heading: 120 },
        { id: 'TRUCK-003', lat: 37.7649, lng: -122.4294, driver: 'David Rodriguez', status: 'warning' as const, heading: 270 },
        { id: 'TRUCK-004', lat: 37.7549, lng: -122.4394, driver: 'Emma Wilson', status: 'idle' as const, heading: 0 },
      ];
      setVehicles(fallbackVehicles);
    }
  };

  const clearMarkers = () => {
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
  };

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

  const generateAndDisplayRoutes = async (vehicleList: Vehicle[]) => {
    if (!map.current || !mapboxToken) return;

    const routes: DeliveryRoute[] = [];

    for (const vehicle of vehicleList) {
      if (vehicle.status === 'active') {
        try {
          const startLocation: RouteWaypoint = {
            id: `start-${vehicle.id}`,
            coordinates: [vehicle.lng, vehicle.lat],
            address: `${vehicle.driver}'s Current Location`
          };

          const packageDestinations = generateMockPackageDestinations([vehicle.lng, vehicle.lat]);
          
          const deliveryRoute = await createDeliveryRoute(
            vehicle.id,
            startLocation,
            packageDestinations,
            mapboxToken
          );

          routes.push(deliveryRoute);
          addRouteToMap(deliveryRoute);
          addCheckpointsToMap(deliveryRoute);

        } catch (error) {
          console.error(`Failed to create route for vehicle ${vehicle.id}:`, error);
        }
      }
    }

    setDeliveryRoutes(routes);
  };

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
        'line-color': getVehicleColor(deliveryRoute.vehicleId),
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    routeLayerIds.current.push(routeLineId, routeId);
  };

  const addCheckpointsToMap = (deliveryRoute: DeliveryRoute) => {
    if (!map.current) return;

    deliveryRoute.waypoints.forEach((waypoint, index) => {
      // Create checkpoint marker
      const el = document.createElement('div');
      el.className = 'checkpoint-marker';
      el.style.width = '32px';
      el.style.height = '32px';
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

      markers.current.push(marker);

      // Show popup on hover
      el.addEventListener('mouseenter', () => popup.addTo(map.current!));
      el.addEventListener('mouseleave', () => popup.remove());
    });
  };

  const getVehicleColor = (vehicleId: string): string => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];
    const index = vehicleId.charCodeAt(vehicleId.length - 1) % colors.length;
    return colors[index];
  };

  const initializeMap = () => {
    if (!mapboxToken || !mapContainer.current || isMapInitialized) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-122.4194, 37.7749], // San Francisco
        zoom: 12,
        pitch: 45,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      map.current.on('load', () => {
        addVehicleMarkers(vehicles);
        if (showRoutes) {
          generateAndDisplayRoutes(vehicles);
        }
        setIsMapInitialized(true);
        toast({
          title: "Map Initialized",
          description: "Interactive map with routing is ready.",
        });
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map. Please check your Mapbox token.",
        variant: "destructive"
      });
    }
  };

  const addVehicleMarkers = (vehicleList: Vehicle[]) => {
    if (!map.current) return;

    vehicleList.forEach((vehicle) => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'vehicle-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      el.style.cursor = 'pointer';
      el.style.transform = `rotate(${vehicle.heading}deg)`;
      el.style.zIndex = '1000';
      
      const statusColors = {
        active: '#10B981', // green
        warning: '#F59E0B', // yellow
        idle: '#6B7280' // gray
      };
      el.style.backgroundColor = statusColors[vehicle.status];

      // Add truck icon
      el.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
          <path d="M19.15 8a2 2 0 0 0-1.72-1H15V5a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 1 1.73 3.49 3.49 0 0 0 7 .27h3.1a3.48 3.48 0 0 0 6.9 0 2 2 0 0 0 2-2v-4a2 2 0 0 0-.85-1.63zM7 19a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 7 19zm11 0a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 18 19z"/>
        </svg>
      `;

      const routeInfo = deliveryRoutes.find(r => r.vehicleId === vehicle.id);

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false
      }).setHTML(`
        <div style="padding: 12px; min-width: 250px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <div style="background: ${statusColors[vehicle.status]}; 
                        width: 12px; height: 12px; border-radius: 50%; margin-right: 8px;"></div>
            <strong>${vehicle.id}</strong>
          </div>
          <div style="margin-bottom: 4px;"><strong>Driver:</strong> ${vehicle.driver}</div>
          <div style="margin-bottom: 4px;">
            <strong>Status:</strong> 
            <span style="color: ${statusColors[vehicle.status]}; text-transform: capitalize;">
              ${vehicle.status}
            </span>
          </div>
          ${routeInfo ? `
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="margin-bottom: 4px;">
              <strong>Route Distance:</strong> ${formatDistance(routeInfo.distance || 0)}
            </div>
            <div style="margin-bottom: 4px;">
              <strong>Estimated Time:</strong> ${formatDuration(routeInfo.duration || 0)}
            </div>
            <div>
              <strong>Deliveries:</strong> ${routeInfo.waypoints.length} packages
            </div>
          ` : ''}
        </div>
      `);

      // Add marker to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat([vehicle.lng, vehicle.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);

      // Show popup on hover
      el.addEventListener('mouseenter', () => popup.addTo(map.current!));
      el.addEventListener('mouseleave', () => popup.remove());
    });
  };

  const toggleRoutes = () => {
    setShowRoutes(!showRoutes);
    
    if (!showRoutes && isMapInitialized) {
      // Show routes
      generateAndDisplayRoutes(vehicles);
    } else {
      // Hide routes
      clearRoutes();
      setDeliveryRoutes([]);
    }
  };

  const refreshMap = async () => {
    setLoading(true);
    try {
      await loadVehicles();
      if (map.current) {
        map.current.resize();
      }
      toast({
        title: "Map Refreshed",
        description: "Vehicle positions and routes updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to update vehicle positions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  // Auto-initialize map when token is available
  useEffect(() => {
    if (mapboxToken && !isMapInitialized) {
      initializeMap();
    }
  }, [mapboxToken, isMapInitialized]);

  if (mapboxToken && !isMapInitialized) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Initializing Fleet Map with Routing...</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading map with Mapbox Directions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isMapInitialized && !mapboxToken) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Interactive Fleet Map with Routing</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-64 h-48 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
              <div className="space-y-2 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Map Configuration Required</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Enter your Mapbox Public Token</p>
                <Input
                  type="password"
                  placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6..."
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Get your token from{' '}
                  <a 
                    href="https://account.mapbox.com/access-tokens/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    mapbox.com/tokens
                  </a>
                </p>
              </div>
              <Button onClick={initializeMap} disabled={!mapboxToken} className="w-full">
                <Navigation className="h-4 w-4 mr-2" />
                Initialize Map
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Live Fleet Map with Routes</span>
            {isMapInitialized && (
              <span className="text-xs text-muted-foreground">
                ({vehicles.length} vehicles, {deliveryRoutes.length} routes)
              </span>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant={showRoutes ? "default" : "outline"}
              size="sm" 
              onClick={toggleRoutes}
              disabled={!isMapInitialized}
            >
              <Route className="h-4 w-4 mr-2" />
              {showRoutes ? 'Hide Routes' : 'Show Routes'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => map.current?.setStyle('mapbox://styles/mapbox/satellite-v9')}
              disabled={!isMapInitialized}
            >
              <Layers className="h-4 w-4 mr-2" />
              Satellite
            </Button>
            <Button variant="outline" size="sm" onClick={refreshMap} disabled={loading || !isMapInitialized}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div ref={mapContainer} className="w-full h-full rounded-b-lg" />
        {showRoutes && deliveryRoutes.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-4 w-4" />
              <span className="font-medium text-sm">Route Summary</span>
            </div>
            <div className="space-y-1 text-xs">
              {deliveryRoutes.map(route => (
                <div key={route.vehicleId} className="flex justify-between">
                  <span>{route.vehicleId}:</span>
                  <span>{route.waypoints.length} stops</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}