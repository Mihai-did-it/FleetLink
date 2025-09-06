import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Plus, 
  Package, 
  MapPin, 
  Play, 
  Pause, 
  Square, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { addVehicle, startSimulation, pauseSimulation, stopSimulation } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ControlPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  onVehicleUpdate: () => void;
}

export function ControlPanel({ isExpanded, onToggle, onVehicleUpdate }: ControlPanelProps) {
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_id: '',
    driver: '',
    packages: 0,
    destination: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddVehicle = async () => {
    if (!newVehicle.vehicle_id || !newVehicle.driver) {
      toast({
        title: 'Error',
        description: 'Vehicle ID and Driver Name are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await addVehicle({
        vehicle_id: newVehicle.vehicle_id,
        driver: newVehicle.driver,
        packages: newVehicle.packages,
        next_stop: newVehicle.destination || 'Awaiting Assignment',
        status: 'idle',
        location: 'Depot',
        speed: 0,
        eta: '--'
      });

      setShowAddVehicleDialog(false);
      setNewVehicle({ vehicle_id: '', driver: '', packages: 0, destination: '' });
      onVehicleUpdate();
      
      toast({
        title: 'Vehicle Added',
        description: `${newVehicle.vehicle_id} has been added to the fleet`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add vehicle',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulation = async () => {
    setLoading(true);
    try {
      await startSimulation();
      setIsSimulationRunning(true);
      toast({
        title: 'Simulation Started',
        description: 'Fleet is now in motion with live updates',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start simulation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseSimulation = async () => {
    setLoading(true);
    try {
      await pauseSimulation();
      setIsSimulationRunning(false);
      toast({
        title: 'Simulation Paused',
        description: 'Fleet movement paused',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pause simulation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStopSimulation = async () => {
    setLoading(true);
    try {
      await stopSimulation();
      setIsSimulationRunning(false);
      toast({
        title: 'Simulation Stopped',
        description: 'All vehicles returned to depot',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop simulation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`
      absolute top-4 right-4 z-20 transition-all duration-300 ease-in-out
      ${isExpanded ? 'w-80' : 'w-16'}
    `}>
      <div className="
        bg-slate-900/80 backdrop-blur-md border border-slate-700/50 
        rounded-xl shadow-2xl overflow-hidden
      ">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Fleet Controls</h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-4">
            <Tabs defaultValue="simulation" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700">
                <TabsTrigger value="simulation" className="text-xs">Simulation</TabsTrigger>
                <TabsTrigger value="vehicles" className="text-xs">Vehicles</TabsTrigger>
                <TabsTrigger value="packages" className="text-xs">Packages</TabsTrigger>
              </TabsList>

              {/* Simulation Controls */}
              <TabsContent value="simulation" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isSimulationRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                    <span className="text-sm text-slate-300">
                      {isSimulationRunning ? 'Running' : 'Stopped'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={handleStartSimulation}
                      disabled={isSimulationRunning || loading}
                      size="sm"
                      className="bg-green-600/80 hover:bg-green-600 border-0"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={handlePauseSimulation}
                      disabled={!isSimulationRunning || loading}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={handleStopSimulation}
                      disabled={!isSimulationRunning || loading}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600/20"
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Add Vehicle */}
              <TabsContent value="vehicles" className="space-y-4 mt-4">
                <Dialog open={showAddVehicleDialog} onOpenChange={setShowAddVehicleDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-blue-600/80 hover:bg-blue-600 border-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900/95 backdrop-blur-md border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add New Vehicle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicle-id" className="text-slate-300">Vehicle ID</Label>
                        <Input
                          id="vehicle-id"
                          value={newVehicle.vehicle_id}
                          onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicle_id: e.target.value }))}
                          placeholder="e.g., TRUCK-005"
                          className="bg-slate-800/50 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="driver" className="text-slate-300">Driver Name</Label>
                        <Input
                          id="driver"
                          value={newVehicle.driver}
                          onChange={(e) => setNewVehicle(prev => ({ ...prev, driver: e.target.value }))}
                          placeholder="e.g., John Smith"
                          className="bg-slate-800/50 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="packages" className="text-slate-300">Initial Packages</Label>
                        <Input
                          id="packages"
                          type="number"
                          value={newVehicle.packages}
                          onChange={(e) => setNewVehicle(prev => ({ ...prev, packages: parseInt(e.target.value) || 0 }))}
                          placeholder="0"
                          className="bg-slate-800/50 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="destination" className="text-slate-300">Destination (Optional)</Label>
                        <Input
                          id="destination"
                          value={newVehicle.destination}
                          onChange={(e) => setNewVehicle(prev => ({ ...prev, destination: e.target.value }))}
                          placeholder="e.g., Downtown Mall"
                          className="bg-slate-800/50 border-slate-600 text-white"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowAddVehicleDialog(false)} className="border-slate-600 text-slate-300">
                          Cancel
                        </Button>
                        <Button onClick={handleAddVehicle} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                          {loading ? 'Adding...' : 'Add Vehicle'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Package Management */}
              <TabsContent value="packages" className="space-y-4 mt-4">
                <div className="text-center text-slate-400 py-4">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Package Management</div>
                  <div className="text-xs">Coming Soon</div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Collapsed State */}
        {!isExpanded && (
          <div className="p-4">
            <div className="flex flex-col items-center space-y-2">
              <Settings className="h-6 w-6 text-blue-400" />
              <div className={`w-2 h-2 rounded-full ${isSimulationRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
