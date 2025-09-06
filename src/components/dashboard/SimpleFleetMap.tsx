import React from 'react';
import { Vehicle } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

interface SimpleFleetMapProps {
  vehicles: Vehicle[];
  onVehicleClick: (vehicle: Vehicle) => void;
  selectedVehicle: Vehicle | null;
}

export function SimpleFleetMap({ vehicles, onVehicleClick, selectedVehicle }: SimpleFleetMapProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'maintenance': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Map Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* City Background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-9xl font-bold text-slate-700/20 select-none">
          SAN FRANCISCO
        </div>
      </div>

      {/* Vehicle Markers */}
      <div className="absolute inset-0">
        {vehicles.map((vehicle, index) => {
          // Position vehicles in a grid pattern for demo
          const x = 20 + (index % 4) * 25;
          const y = 20 + Math.floor(index / 4) * 25;
          
          return (
            <div
              key={vehicle.vehicle_id}
              className={`
                absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
                transition-all duration-300 hover:scale-110
                ${selectedVehicle?.vehicle_id === vehicle.vehicle_id ? 'scale-125 z-10' : 'z-5'}
              `}
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
              onClick={() => onVehicleClick(vehicle)}
            >
              {/* Vehicle Marker */}
              <div className="relative">
                {/* Pulsing Ring for Active Vehicles */}
                {vehicle.status === 'active' && (
                  <div className="absolute -inset-2 bg-green-400/30 rounded-full animate-ping"></div>
                )}
                
                {/* Main Marker */}
                <div className={`
                  w-8 h-8 rounded-full border-2 border-white shadow-lg
                  flex items-center justify-center
                  ${getStatusColor(vehicle.status)}
                `}>
                  <Navigation className="h-4 w-4 text-white" />
                </div>

                {/* Vehicle Info Popup */}
                {selectedVehicle?.vehicle_id === vehicle.vehicle_id && (
                  <Card className="
                    absolute top-10 left-1/2 transform -translate-x-1/2
                    bg-slate-900/95 backdrop-blur-md border-slate-700/50
                    p-3 min-w-48 shadow-xl z-20
                  ">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">{vehicle.vehicle_id}</h3>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(vehicle.status)}`}></div>
                      </div>
                      <div className="text-sm text-slate-300">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{vehicle.location}</span>
                        </div>
                        <div>Driver: {vehicle.driver}</div>
                        <div>Speed: {vehicle.speed} mph</div>
                        <div>Packages: {vehicle.packages}</div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4">
        <Card className="bg-slate-900/80 backdrop-blur-md border-slate-700/50 p-4">
          <h4 className="text-sm font-semibold text-white mb-2">Vehicle Status</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-slate-300">Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-slate-300">Idle</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-300">Maintenance</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-slate-300">Offline</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Map Info */}
      <div className="absolute top-4 left-4">
        <Card className="bg-slate-900/80 backdrop-blur-md border-slate-700/50 p-3">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-white font-medium">Fleet View - San Francisco</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
