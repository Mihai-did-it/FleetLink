// MapControls.tsx - UI controls for map actions (zoom, route generation, etc.)
import React from 'react';

interface MapControlsProps {
  onGenerateRoute?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ onGenerateRoute, onZoomIn, onZoomOut }) => {
  return (
    <div className="absolute top-4 left-4 z-50 flex space-x-2">
      <button className="bg-blue-500 text-white px-3 py-2 rounded" onClick={onZoomIn}>+</button>
      <button className="bg-blue-500 text-white px-3 py-2 rounded" onClick={onZoomOut}>-</button>
      <button className="bg-green-500 text-white px-3 py-2 rounded" onClick={onGenerateRoute}>Generate Route</button>
    </div>
  );
};
