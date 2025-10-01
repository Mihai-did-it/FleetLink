// FleetDashboard.tsx - main dashboard for fleet overview
import React from 'react';

interface FleetDashboardProps {
  vehicles: any[];
  onSelectVehicle: (vehicle: any) => void;
  selectedVehicle: any;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({ vehicles, onSelectVehicle, selectedVehicle }) => {
  // TODO: Implement dashboard UI for vehicle list, stats, etc.
  return null;
};
