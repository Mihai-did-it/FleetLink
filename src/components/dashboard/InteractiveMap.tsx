import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, RefreshCw, Layers, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [mapboxToken, setMapboxToken] = useState('');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [vehicles] = useState<Vehicle[]>([
    { id: 'TRUCK-001', lat: 37.7749, lng: -122.4194, driver: 'Mike Johnson', status: 'active', heading: 45 },
    { id: 'TRUCK-002', lat: 37.7849, lng: -122.4094, driver: 'Sarah Chen', status: 'active', heading: 120 },
    { id: 'TRUCK-003', lat: 37.7649, lng: -122.4294, driver: 'David Rodriguez', status: 'warning', heading: 270 },
    { id: 'TRUCK-004', lat: 37.7549, lng: -122.4394, driver: 'Emma Wilson', status: 'idle', heading: 0 },
  ]);
  const { toast } = useToast();

  const initializeMap = () => {
    if (!mapboxToken || !mapContainer.current) return;

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
        addVehicleMarkers();
        setIsMapInitialized(true);
        toast({
          title: "Map Initialized",
          description: "Interactive map is now ready with vehicle tracking.",
        });
      });

    } catch (error) {
      toast({
        title: "Map Error",
        description: "Failed to initialize map. Please check your Mapbox token.",
        variant: "destructive"
      });
    }
  };

  const addVehicleMarkers = () => {
    if (!map.current) return;

    vehicles.forEach((vehicle) => {
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
      new mapboxgl.Marker(el)
        .setLngLat([vehicle.lng, vehicle.lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Show popup on hover
      el.addEventListener('mouseenter', () => popup.addTo(map.current!));
      el.addEventListener('mouseleave', () => popup.remove());
    });
  };

  const refreshMap = () => {
    if (map.current) {
      map.current.resize();
      toast({
        title: "Map Refreshed",
        description: "Vehicle positions updated.",
      });
    }
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

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
            <Button variant="outline" size="sm" onClick={() => map.current?.setStyle('mapbox://styles/mapbox/satellite-v9')}>
              <Layers className="h-4 w-4 mr-2" />
              Satellite
            </Button>
            <Button variant="outline" size="sm" onClick={refreshMap}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {!isMapInitialized ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md p-6">
              <Input
                type="password"
                placeholder="Enter Mapbox token to initialize map..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="font-mono text-xs"
              />
              <Button onClick={initializeMap} disabled={!mapboxToken}>
                Initialize Map
              </Button>
            </div>
          </div>
        ) : (
          <div ref={mapContainer} className="w-full h-full rounded-b-lg" />
        )}
      </CardContent>
    </Card>
  );
}