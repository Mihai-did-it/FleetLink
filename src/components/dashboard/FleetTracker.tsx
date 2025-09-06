import React, { useState, useEffect } from 'react';
import { SimpleFleetMap } from './SimpleFleetMap';
import { FleetOverviewPanel } from './FleetOverviewPanel';
import { ControlPanel } from './ControlPanel';
import { VehicleDetailsDrawer } from './VehicleDetailsDrawer';
import { Vehicle, getVehicles } from '@/lib/api';

export function FleetTracker() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load vehicles with real-time updates
  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const loadVehicles = async () => {
    try {
      const vehiclesData = await getVehicles();
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleVehicleUpdate = () => {
    loadVehicles();
    if (selectedVehicle) {
      // Update selected vehicle data
      const updated = vehicles.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
      if (updated) {
        setSelectedVehicle(updated);
      }
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Full-screen map background */}
            {/* Map Background */}
      <SimpleFleetMap
        vehicles={vehicles}
        onVehicleClick={setSelectedVehicle}
        selectedVehicle={selectedVehicle}
      />

      {/* Fleet Overview Panel - Left Side */}
      <FleetOverviewPanel
        vehicles={vehicles}
        isExpanded={isOverviewExpanded}
        onToggle={() => setIsOverviewExpanded(!isOverviewExpanded)}
        onVehicleClick={handleVehicleClick}
        selectedVehicle={selectedVehicle}
        loading={loading}
      />

      {/* Control Panel - Top Right */}
      <ControlPanel
        isExpanded={isControlsExpanded}
        onToggle={() => setIsControlsExpanded(!isControlsExpanded)}
        onVehicleUpdate={handleVehicleUpdate}
      />

      {/* Vehicle Details Drawer */}
      <VehicleDetailsDrawer
        vehicle={selectedVehicle}
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onUpdate={handleVehicleUpdate}
      />
    </div>
  );
}
