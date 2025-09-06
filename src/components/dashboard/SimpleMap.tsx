import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Vehicle } from "@/lib/api";

interface SimpleMapProps {
  vehicles: Vehicle[];
  isSimulationRunning: boolean;
}

export function SimpleMap({ vehicles, isSimulationRunning }: SimpleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapboxToken] = useState(import.meta.env.VITE_MAPBOX_TOKEN || '');
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Set Mapbox access token
    mapboxgl.accessToken = mapboxToken;

    // Initialize the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 11,
    });

    map.current.on('load', () => {
      setIsMapReady(true);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxToken]);

  // Update vehicle markers
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add new markers for each vehicle
    vehicles.forEach((vehicle) => {
      if (vehicle.lat && vehicle.lon) {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        el.style.cssText = `
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: white;
          background-color: ${getVehicleColor(vehicle.status || 'idle')};
        `;
        el.innerHTML = '🚛';

        // Create popup with vehicle info
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${vehicle.vehicle_id}</div>
            <div style="font-size: 12px; color: #666;">Driver: ${vehicle.driver}</div>
            <div style="font-size: 12px; color: #666;">Speed: ${vehicle.speed || 0} mph</div>
            <div style="font-size: 12px; color: #666;">Packages: ${vehicle.packages || 0}</div>
            <div style="font-size: 12px; color: #666;">Status: ${vehicle.status || 'idle'}</div>
          </div>
        `);

        // Create and add marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([vehicle.lon, vehicle.lat])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current[vehicle.vehicle_id] = marker;
      }
    });
  }, [vehicles, isMapReady]);

  const getVehicleColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e'; // green
      case 'warning': return '#eab308'; // yellow
      case 'danger': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  if (!mapboxToken) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-600 mb-2">Map Configuration Required</div>
          <div className="text-sm text-gray-500">
            Mapbox token not found. Please check your .env file.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Map overlay with vehicle count */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow-md">
        <div className="text-sm font-medium">
          {vehicles.length} Vehicle{vehicles.length !== 1 ? 's' : ''} Tracked
        </div>
        {isSimulationRunning && (
          <div className="text-xs text-green-600 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            Live Simulation
          </div>
        )}
      </div>

      {/* Map legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow-md">
        <div className="text-xs font-medium mb-2">Vehicle Status</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Danger</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Idle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
