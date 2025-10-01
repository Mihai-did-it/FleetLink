import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapContainerProps {
  mapboxToken: string;
  vehicles: any[];
  onRouteDraw?: (vehicleId: string, route: any) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({ mapboxToken, vehicles, onRouteDraw }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    mapboxgl.accessToken = mapboxToken;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-122.4194, 37.7749],
      zoom: 12,
      attributionControl: false,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    // TODO: Add vehicle markers, routes, etc.
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  // TODO: Add effect for updating vehicles/routes

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
};
