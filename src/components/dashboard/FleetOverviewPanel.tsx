import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Truck, Clock, Package, MapPin, Gauge } from 'lucide-react';
import { Vehicle } from '@/lib/api';

interface FleetOverviewPanelProps {
  vehicles: Vehicle[];
  isExpanded: boolean;
  onToggle: () => void;
  onVehicleClick: (vehicle: Vehicle) => void;
  selectedVehicle: Vehicle | null;
  loading: boolean;
}

export function FleetOverviewPanel({
  vehicles,
  isExpanded,
  onToggle,
  onVehicleClick,
  selectedVehicle,
  loading
}: FleetOverviewPanelProps) {
  const getStatusInfo = (vehicle: Vehicle) => {
    const status = vehicle.status || 'idle';
    switch (status) {
      case 'active':
        return { label: 'On Time', color: 'bg-emerald-500/90', textColor: 'text-emerald-100' };
      case 'warning':
        return { label: 'Delayed', color: 'bg-amber-500/90', textColor: 'text-amber-100' };
      case 'danger':
        return { label: 'Critical', color: 'bg-red-500/90', textColor: 'text-red-100' };
      default:
        return { label: 'Idle', color: 'bg-slate-500/90', textColor: 'text-slate-100' };
    }
  };

  const getProgressValue = (vehicle: Vehicle) => {
    // Simulate progress based on status and speed
    if (vehicle.status === 'active') {
      return Math.min(90, (vehicle.speed || 0) * 2);
    }
    return vehicle.status === 'warning' ? 45 : 10;
  };

  return (
    <div className={`
      absolute top-4 left-4 z-20 transition-all duration-300 ease-in-out
      ${isExpanded ? 'w-80' : 'w-16'}
    `}>
      {/* Main Panel */}
      <div className="
        bg-slate-900/80 backdrop-blur-md border border-slate-700/50 
        rounded-xl shadow-2xl overflow-hidden
      ">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Fleet Overview</h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Stats Overview */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-400">
                    {vehicles.filter(v => v.status === 'active').length}
                  </div>
                  <div className="text-xs text-slate-300">Active</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-emerald-400">
                    {vehicles.reduce((sum, v) => sum + (v.packages || 0), 0)}
                  </div>
                  <div className="text-xs text-slate-300">Packages</div>
                </div>
              </div>
            </div>

            {/* Vehicle List */}
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="text-center text-slate-400 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                  Loading vehicles...
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <div>No vehicles available</div>
                  <div className="text-xs">Add vehicles to start tracking</div>
                </div>
              ) : (
                vehicles.map((vehicle) => {
                  const statusInfo = getStatusInfo(vehicle);
                  const isSelected = selectedVehicle?.vehicle_id === vehicle.vehicle_id;
                  
                  return (
                    <Card
                      key={vehicle.vehicle_id}
                      className={`
                        cursor-pointer transition-all duration-200 border-0
                        ${isSelected 
                          ? 'bg-blue-600/30 border-blue-400/50 shadow-lg shadow-blue-500/20' 
                          : 'bg-slate-800/50 hover:bg-slate-700/50'
                        }
                        backdrop-blur-sm
                      `}
                      onClick={() => onVehicleClick(vehicle)}
                    >
                      <div className="p-4">
                        {/* Primary Info */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
                            <span className="font-semibold text-white text-sm">
                              {vehicle.vehicle_id}
                            </span>
                          </div>
                          <Badge className={`${statusInfo.color} ${statusInfo.textColor} border-0 text-xs`}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-300">{vehicle.driver}</span>
                            <div className="flex items-center space-x-1 text-slate-300">
                              <Clock className="h-3 w-3" />
                              <span>{vehicle.eta || '--'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-1 text-slate-300">
                              <Package className="h-3 w-3" />
                              <span>{vehicle.packages || 0} pkgs</span>
                            </div>
                            <div className="flex items-center space-x-1 text-slate-300">
                              <Gauge className="h-3 w-3" />
                              <span>{vehicle.speed || 0} mph</span>
                            </div>
                          </div>

                          {/* Secondary Info */}
                          {vehicle.next_stop && (
                            <div className="pt-2 border-t border-slate-600/50">
                              <div className="flex items-center space-x-1 text-xs text-slate-400 mb-1">
                                <MapPin className="h-3 w-3" />
                                <span>Next Stop</span>
                              </div>
                              <div className="text-xs text-slate-200 font-medium truncate">
                                {vehicle.next_stop}
                              </div>
                              <Progress 
                                value={getProgressValue(vehicle)} 
                                className="h-1 mt-2 bg-slate-700"
                              />
                            </div>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete vehicle ${vehicle.vehicle_id} and all its packages?`)) {
                                const { deleteVehicleCascade } = await import('@/lib/deleteVehicleCascade');
                                await deleteVehicleCascade(vehicle.vehicle_id);
                                window.location.reload();
                              }
                            }}
                            className="mt-3 w-full px-3 py-2 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                          >
                            Delete Vehicle
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Collapsed State */}
        {!isExpanded && (
          <div className="p-4">
            <div className="flex flex-col items-center space-y-2">
              <Truck className="h-6 w-6 text-blue-400" />
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-400">{vehicles.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
