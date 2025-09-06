import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Vehicle } from '@/lib/api';

interface FleetMapProps {
  vehicles: Vehicle[];
  onVehicleClick: (vehicle: Vehicle) => void;
  selectedVehicle: Vehicle | null;
}

export function FleetMap({ vehicles, onVehicleClick, selectedVehicle }: FleetMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const routesRef = useRef<{ [key: string]: string }>({});
  const [mapboxToken] = useState(import.meta.env.VITE_MAPBOX_TOKEN || '');
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme for modern glass look
      center: [-122.4194, 37.7749],
      zoom: 12,
      attributionControl: false,
    });

    // Add custom controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.current.on('load', () => {
      setIsMapReady(true);
      // Add route layers
      map.current!.addSource('routes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.current!.addLayer({
        id: 'routes',
        type: 'line',
        source: 'routes',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-opacity': 0.8
        }
      });
    });

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
        const isSelected = selectedVehicle?.vehicle_id === vehicle.vehicle_id;
        
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        el.style.cssText = `
          width: ${isSelected ? '32px' : '24px'};
          height: ${isSelected ? '32px' : '24px'};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? '14px' : '12px'};
          font-weight: bold;
          color: white;
          background: ${getVehicleGradient(vehicle.status || 'idle')};
          transition: all 0.3s ease;
          backdrop-filter: blur(4px);
          z-index: ${isSelected ? '1000' : '100'};
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
        `;
        el.innerHTML = '🚛';

        // Add click handler
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onVehicleClick(vehicle);
        });

        // Create enhanced popup
        const popup = new mapboxgl.Popup({ 
          offset: 25,
          className: 'vehicle-popup'
        }).setHTML(`
          <div style="
            padding: 12px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            border-radius: 8px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            color: white;
            font-family: system-ui;
          ">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #60a5fa;">${vehicle.vehicle_id}</div>
            <div style="display: grid; gap: 4px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Driver:</span>
                <span>${vehicle.driver}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Speed:</span>
                <span>${vehicle.speed || 0} mph</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Packages:</span>
                <span>${vehicle.packages || 0}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Status:</span>
                <span style="color: ${getStatusColor(vehicle.status || 'idle')}; font-weight: bold;">
                  ${(vehicle.status || 'idle').toUpperCase()}
                </span>
              </div>
              ${vehicle.next_stop ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
                  <div style="color: #94a3b8; font-size: 12px;">Next Stop:</div>
                  <div style="font-weight: 500;">${vehicle.next_stop}</div>
                </div>
              ` : ''}
            </div>
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
  }, [vehicles, isMapReady, selectedVehicle]);

  // Update routes (simplified for now)
  useEffect(() => {
    if (!map.current || !isMapReady || !selectedVehicle) return;

    // For demo, create a simple route line to next stop
    const vehicle = selectedVehicle;
    if (vehicle.lat && vehicle.lon) {
      // Simple route simulation - in real app would use Mapbox Directions API
      const routeFeature = {
        type: 'Feature' as const,
        properties: { vehicleId: vehicle.vehicle_id },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [vehicle.lon, vehicle.lat],
            [vehicle.lon + 0.01, vehicle.lat + 0.01] // Demo destination
          ]
        }
      };

      const source = map.current!.getSource('routes') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: [routeFeature]
        });
      }
    }
  }, [selectedVehicle, isMapReady]);

  const getVehicleGradient = (status: string) => {
    switch (status) {
      case 'active': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'warning': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'danger': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      default: return 'linear-gradient(135deg, #6b7280, #4b5563)';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <div className="text-xl font-semibold mb-2">Map Configuration Required</div>
          <div className="text-sm text-slate-400">
            Mapbox token not found. Please check your .env file.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map overlay UI */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-lg px-4 py-2 text-white shadow-xl">
          <div className="text-sm font-medium">
            FleetLink - Real-Time Tracking
          </div>
          <div className="text-xs text-slate-300">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} • Live Updates
          </div>
        </div>
      </div>
    </div>
  );
}
