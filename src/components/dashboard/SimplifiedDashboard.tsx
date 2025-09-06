import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Play, Pause, Square, MapPin, Truck, Clock, Package, Gauge } from "lucide-react";
import { SimpleMap } from "./SimpleMap";
import { getVehicles, addVehicle, startSimulation, pauseSimulation, stopSimulation, Vehicle } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function SimplifiedDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_id: "",
    driver: "",
  });
  const { toast } = useToast();

  // Load vehicles and set up auto-refresh
  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 3000); // Refresh every 3 seconds for live updates
    return () => clearInterval(interval);
  }, []);

  const loadVehicles = async () => {
    try {
      const vehiclesData = await getVehicles();
      setVehicles(vehiclesData);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.vehicle_id || !newVehicle.driver) {
      toast({
        title: "Error",
        description: "Please fill in both Vehicle ID and Driver Name",
        variant: "destructive",
      });
      return;
    }

    try {
      const vehicleData = {
        ...newVehicle,
        status: "idle" as const,
        location: "Depot",
        speed: 0,
        packages: Math.floor(Math.random() * 10) + 1,
        eta: "--",
        next_stop: "Awaiting Assignment"
      };
      
      await addVehicle(vehicleData);
      setShowAddDialog(false);
      setNewVehicle({ vehicle_id: "", driver: "" });
      await loadVehicles();
      
      toast({
        title: "Vehicle Added",
        description: `${vehicleData.vehicle_id} with driver ${vehicleData.driver} added to fleet`,
      });
    } catch (error) {
      console.error("Failed to add vehicle:", error);
      toast({
        title: "Error",
        description: "Failed to add vehicle",
        variant: "destructive",
      });
    }
  };

  const handleStartSimulation = async () => {
    setLoading(true);
    try {
      await startSimulation();
      setIsSimulationRunning(true);
      toast({
        title: "Simulation Started",
        description: "Vehicles are now moving with live updates",
      });
    } catch (error) {
      console.error("Failed to start simulation:", error);
      toast({
        title: "Error",
        description: "Failed to start simulation",
        variant: "destructive",
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
        title: "Simulation Paused",
        description: "Vehicle movement paused",
      });
    } catch (error) {
      console.error("Failed to pause simulation:", error);
      toast({
        title: "Error",
        description: "Failed to pause simulation",
        variant: "destructive",
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
        title: "Simulation Stopped",
        description: "All vehicles returned to depot",
      });
    } catch (error) {
      console.error("Failed to stop simulation:", error);
      toast({
        title: "Error",
        description: "Failed to stop simulation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Real-Time Fleet Tracker</h1>
          <p className="text-muted-foreground">Add vehicles, see them on the map, and watch them move in real-time</p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Fleet Control Center</span>
              <Badge variant={isSimulationRunning ? "default" : "secondary"}>
                {isSimulationRunning ? "Simulation Running" : "Simulation Stopped"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Vehicle</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle-id">Vehicle ID</Label>
                      <Input
                        id="vehicle-id"
                        value={newVehicle.vehicle_id}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicle_id: e.target.value }))}
                        placeholder="e.g., TRUCK-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driver">Driver Name</Label>
                      <Input
                        id="driver"
                        value={newVehicle.driver}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, driver: e.target.value }))}
                        placeholder="e.g., John Smith"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                      <Button onClick={handleAddVehicle}>Add Vehicle</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                onClick={handleStartSimulation} 
                disabled={isSimulationRunning || loading}
                variant={isSimulationRunning ? "secondary" : "default"}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Simulation
              </Button>

              <Button 
                onClick={handlePauseSimulation} 
                disabled={!isSimulationRunning || loading}
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>

              <Button 
                onClick={handleStopSimulation} 
                disabled={!isSimulationRunning || loading}
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">Live Map</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicle List ({vehicles.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Real-Time Fleet Map</span>
                  {isSimulationRunning && (
                    <Badge variant="default" className="animate-pulse">Live</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gray-100 rounded-lg">
                  <SimpleMap vehicles={vehicles} isSimulationRunning={isSimulationRunning} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="vehicles">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.vehicle_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Truck className="h-4 w-4" />
                        <span>{vehicle.vehicle_id}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(vehicle.status || 'idle')}`} />
                        <Badge variant="outline" className="text-xs">
                          {vehicle.status || 'idle'}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">{vehicle.driver}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {vehicle.location || "Unknown"}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <Gauge className="h-3 w-3 mx-auto mb-1" />
                        <p className="font-medium">{vehicle.speed || 0} mph</p>
                        <p className="text-muted-foreground">Speed</p>
                      </div>
                      <div className="text-center">
                        <Package className="h-3 w-3 mx-auto mb-1" />
                        <p className="font-medium">{vehicle.packages || 0}</p>
                        <p className="text-muted-foreground">Packages</p>
                      </div>
                      <div className="text-center">
                        <Clock className="h-3 w-3 mx-auto mb-1" />
                        <p className="font-medium">{vehicle.eta || "--"}</p>
                        <p className="text-muted-foreground">ETA</p>
                      </div>
                    </div>

                    {vehicle.next_stop && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Next Stop</p>
                        <p className="text-sm font-medium">{vehicle.next_stop}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {vehicles.length === 0 && (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="text-center py-12">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Vehicles Yet</h3>
                    <p className="text-muted-foreground mb-4">Add your first vehicle to get started with fleet tracking</p>
                    <Button onClick={() => setShowAddDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Vehicle
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
