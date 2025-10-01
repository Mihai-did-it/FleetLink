// VehicleDetailsPanel.tsx - shows details for selected vehicle
import React from 'react';

interface VehicleDetailsPanelProps {
  vehicle: any;
  onGenerateRoute: () => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  loading: boolean;
}

export const VehicleDetailsPanel: React.FC<VehicleDetailsPanelProps> = ({ vehicle, onGenerateRoute, onStartSimulation, onStopSimulation, loading }) => {
  // TODO: Implement vehicle details UI
  return null;
};
