import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Plus, AlertTriangle, Car, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  startSimulation as apiStartSimulation,
  pauseSimulation as apiPauseSimulation,
  stopSimulation as apiStopSimulation,
  getDrivers,
  addDriver as apiAddDriver,
  getTrafficEvents,
  addTrafficEvent as apiAddTrafficEvent,
  removeTrafficEvent as apiRemoveTrafficEvent,
  Driver,
  TrafficEvent
} from "@/lib/api";

export function SimulationControls() {
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trafficEvents, setTrafficEvents] = useState<TrafficEvent[]>([]);
  const [newDriverName, setNewDriverName] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadDrivers();
    loadTrafficEvents();
  }, []);

  const loadDrivers = async () => {
    try {
      const driversData = await getDrivers();
      setDrivers(driversData);
    } catch (error) {
      console.error("Failed to load drivers:", error);
    }
  };

  const loadTrafficEvents = async () => {
    try {
      const eventsData = await getTrafficEvents();
      setTrafficEvents(eventsData);
    } catch (error) {
      console.error("Failed to load traffic events:", error);
    }
  };

  const startSimulation = async () => {
    setLoading(true);
    try {
      await apiStartSimulation();
      setIsSimulationRunning(true);
      toast({
        title: "Simulation Started",
        description: "Fleet simulation is now running with live updates.",
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

  const pauseSimulation = async () => {
    setLoading(true);
    try {
      await apiPauseSimulation();
      setIsSimulationRunning(false);
      toast({
        title: "Simulation Paused",
        description: "Fleet simulation has been paused.",
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

  const stopSimulation = async () => {
    setLoading(true);
    try {
      await apiStopSimulation();
      setIsSimulationRunning(false);
      setTrafficEvents([]);
      toast({
        title: "Simulation Stopped",
        description: "Fleet simulation has been reset.",
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

  const addDriver = async () => {
    if (!newDriverName || !newVehicleType) return;
    
    try {
      const newDriver = await apiAddDriver({
        name: newDriverName,
        vehicleType: newVehicleType,
        status: "available"
      });
      
      setDrivers([...drivers, newDriver]);
      setNewDriverName("");
      setNewVehicleType("");
      toast({
        title: "Driver Added",
        description: `${newDriverName} has been added to the fleet.`,
      });
    } catch (error) {
      console.error("Failed to add driver:", error);
      toast({
        title: "Error",
        description: "Failed to add driver",
        variant: "destructive",
      });
    }
  };

  const addTrafficEvent = async (type: TrafficEvent['type']) => {
    const locations = ["Downtown District", "Highway 101", "Industrial Zone", "City Center"];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    try {
      const newEvent = await apiAddTrafficEvent({
        type,
        location,
        severity: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as TrafficEvent['severity'],
        duration: Math.floor(Math.random() * 60) + 15
      });
      
      setTrafficEvents([...trafficEvents, newEvent]);
      toast({
        title: "Traffic Event Added",
        description: `${type.replace('_', ' ')} reported at ${location}`,
        variant: "destructive"
      });
    } catch (error) {
      console.error("Failed to add traffic event:", error);
      toast({
        title: "Error",
        description: "Failed to add traffic event", 
        variant: "destructive",
      });
    }
  };

  const removeTrafficEvent = async (eventId: string) => {
    try {
      await apiRemoveTrafficEvent(eventId);
      setTrafficEvents(trafficEvents.filter(event => event.id !== eventId));
    } catch (error) {
      console.error("Failed to remove traffic event:", error);
      toast({
        title: "Error",
        description: "Failed to remove traffic event",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Car className="h-5 w-5" />
            <span>Simulation Controls</span>
            {isSimulationRunning && (
              <Badge variant="default" className="ml-auto">
                <div className="w-2 h-2 bg-fleet-active rounded-full mr-2 animate-pulse"></div>
                Running
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={startSimulation} 
              disabled={isSimulationRunning || loading}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>{loading ? "Starting..." : "Start"}</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={pauseSimulation} 
              disabled={!isSimulationRunning || loading}
              className="flex items-center space-x-2"
            >
              <Pause className="h-4 w-4" />
              <span>{loading ? "Pausing..." : "Pause"}</span>
            </Button>
            <Button 
              variant="destructive" 
              onClick={stopSimulation}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Square className="h-4 w-4" />
              <span>{loading ? "Stopping..." : "Stop"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Driver Management */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Driver Name</Label>
              <Input
                id="driver-name"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="Enter driver name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Vehicle Type</Label>
              <Select value={newVehicleType} onValueChange={setNewVehicleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Truck">Delivery Truck</SelectItem>
                  <SelectItem value="Van">Cargo Van</SelectItem>
                  <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={addDriver} className="w-full" disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            {loading ? "Adding..." : "Add Driver"}
          </Button>
          
          <div className="space-y-2">
            <h4 className="font-medium">Current Drivers ({drivers.length})</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {drivers.map((driver) => (
                <div key={driver.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      driver.status === 'active' ? 'bg-fleet-active' :
                      driver.status === 'assigned' ? 'bg-fleet-warning' : 'bg-fleet-idle'
                    }`} />
                    <span className="text-sm font-medium">{driver.name}</span>
                    <Badge variant="outline" className="text-xs">{driver.vehicleType}</Badge>
                  </div>
                  <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>
                    {driver.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traffic & Obstacles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Traffic Events</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              onClick={() => addTrafficEvent('accident')}
              className="text-xs"
              disabled={loading}
            >
              Add Accident
            </Button>
            <Button 
              variant="outline" 
              onClick={() => addTrafficEvent('construction')}
              className="text-xs"
              disabled={loading}
            >
              Add Construction
            </Button>
            <Button 
              variant="outline" 
              onClick={() => addTrafficEvent('heavy_traffic')}
              className="text-xs"
              disabled={loading}
            >
              Add Traffic Jam
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Active Events ({trafficEvents.length})</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {trafficEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`h-3 w-3 ${
                      event.severity === 'high' ? 'text-destructive' :
                      event.severity === 'medium' ? 'text-fleet-warning' : 'text-fleet-idle'
                    }`} />
                    <span className="text-xs">{event.type.replace('_', ' ')}</span>
                    <span className="text-xs text-muted-foreground">{event.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{event.duration}m</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeTrafficEvent(event.id)}
                      className="h-6 w-6 p-0"
                      disabled={loading}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              {trafficEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">No active traffic events</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}