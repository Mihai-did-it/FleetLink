// SimulationManager.tsx - coordinates all simulation logic
import React from 'react';

interface SimulationManagerProps {
  vehicles: any[];
  onStartSimulation: (vehicle: any) => void;
  onStopSimulation: (vehicleId: string) => void;
  simulationStates: Map<string, any>;
  setSimulationStates: (states: Map<string, any>) => void;
}

export const SimulationManager: React.FC<SimulationManagerProps> = ({ vehicles, onStartSimulation, onStopSimulation, simulationStates, setSimulationStates }) => {
  // TODO: Implement simulation orchestration and UI
  return null;
};
