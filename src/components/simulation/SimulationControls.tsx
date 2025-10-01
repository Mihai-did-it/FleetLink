// SimulationControls.tsx - UI for controlling simulation speed, start/stop, etc.
import React from 'react';

interface SimulationControlsProps {
  onStart: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  currentSpeed: number;
  isActive: boolean;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({ onStart, onStop, onSpeedChange, currentSpeed, isActive }) => {
  return (
    <div className="flex space-x-2">
      <button className="bg-green-500 text-white px-3 py-2 rounded" onClick={onStart} disabled={isActive}>Start</button>
      <button className="bg-red-500 text-white px-3 py-2 rounded" onClick={onStop} disabled={!isActive}>Stop</button>
      {[1, 2, 4, 8].map(speed => (
        <button key={speed} className={`px-3 py-1 rounded text-xs font-medium ${currentSpeed === speed ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`} onClick={() => onSpeedChange(speed)}>{speed}x</button>
      ))}
    </div>
  );
};
