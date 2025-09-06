import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, RefreshCw, Layers, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getVehicles, Vehicle as ApiVehicle } from "@/lib/api";

interface Vehicle {
  id: string;
  lat: number;
  lng: number;
  driver: string;
  status: 'active' | 'idle' | 'warning';
  heading: number;
}

export function InteractiveMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken] = useState(import.meta.env.VITE_MAPBOX_TOKEN || '');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
      
      // Update map markers if map is initialized
      if (isMapInitialized && map.current) {
        clearMarkers();
        addVehicleMarkers(transformedVehicles);
      }
    } catch (error) {
      console.error("Failed to load vehicles for map:", error);
      // Use fallback data
      setVehicles([
        { id: 'TRUCK-001', lat: 37.7749, lng: -122.4194, driver: 'Mike Johnson', status: 'active', heading: 45 },
        { id: 'TRUCK-002', lat: 37.7849, lng: -122.4094, driver: 'Sarah Chen', status: 'active', heading: 120 },
        { id: 'TRUCK-003', lat: 37.7649, lng: -122.4294, driver: 'David Rodriguez', status: 'warning', heading: 270 },
        { id: 'TRUCK-004', lat: 37.7549, lng: -122.4394, driver: 'Emma Wilson', status: 'idle', heading: 0 },
      ]);
    }
  };

  const markers = useRef<mapboxgl.Marker[]>([]);

  const clearMarkers = () => {
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
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
        setIsMapInitialized(true);
        toast({
          title: "Map Initialized",
          description: "Interactive map is now ready with vehicle tracking.",
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
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.transform = `rotate(${vehicle.heading}deg)`;
      
      const statusColors = {
        active: '#10B981', // green
        warning: '#F59E0B', // yellow
        idle: '#6B7280' // gray
      };
      el.style.backgroundColor = statusColors[vehicle.status];

      // Add truck icon
      el.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
          <path d="M19.15 8a2 2 0 0 0-1.72-1H15V5a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 1 1.73 3.49 3.49 0 0 0 7 .27h3.1a3.48 3.48 0 0 0 6.9 0 2 2 0 0 0 2-2v-4a2 2 0 0 0-.85-1.63zM7 19a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 7 19zm11 0a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 18 19z"/>
        </svg>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false
      }).setHTML(`
        <div style="padding: 8px;">
          <strong>${vehicle.id}</strong><br/>
          Driver: ${vehicle.driver}<br/>
          Status: <span style="color: ${statusColors[vehicle.status]};">${vehicle.status}</span>
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

  const refreshMap = async () => {
    setLoading(true);
    try {
      await loadVehicles();
      if (map.current) {
        map.current.resize();
      }
      toast({
        title: "Map Refreshed",
        description: "Vehicle positions updated.",
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
              <span>Initializing Fleet Map...</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading map with Mapbox...</p>
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
              <span>Interactive Fleet Map</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled>
                <Layers className="h-4 w-4 mr-2" />
                Layers
              </Button>
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
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
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
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
            <span>Live Fleet Map</span>
            {isMapInitialized && (
              <span className="text-xs text-muted-foreground">({vehicles.length} vehicles)</span>
            )}
          </CardTitle>
          <div className="flex space-x-2">
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
      </CardContent>
    </Card>
  );
}