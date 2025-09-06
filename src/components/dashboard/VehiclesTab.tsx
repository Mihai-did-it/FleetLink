import { VehicleCard } from "./VehicleCard";
import { VehicleDetailsModal } from "./VehicleDetailsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Filter, Search, Plus, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { getVehicles, addVehicle, Vehicle } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function VehiclesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<{
    id: string;
    driver: string;
    status: "active" | "idle" | "warning" | "danger";
    location: string;
    speed: number;
    nextStop: string;
    packages: number;
    eta: string;
  } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_id: "",
    driver: "",
    location: "",
    next_stop: "",
    packages: 0,
    eta: "",
  });
  const { toast } = useToast();

  // Load vehicles on component mount
  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const vehiclesData = await getVehicles();
      setVehicles(vehiclesData);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      toast({
        title: "Error",
        description: "Failed to load vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.vehicle_id || !newVehicle.driver || !newVehicle.location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const vehicleData = {
        ...newVehicle,
        status: "idle" as const,
        speed: 0,
      };
      
      const addedVehicle = await addVehicle(vehicleData);
      setVehicles(prev => [...prev, addedVehicle]);
      setShowAddDialog(false);
      setNewVehicle({
        vehicle_id: "",
        driver: "",
        location: "",
        next_stop: "",
        packages: 0,
        eta: "",
      });
      
      toast({
        title: "Vehicle Added",
        description: `Vehicle ${addedVehicle.vehicle_id} has been added to the fleet.`,
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

  // Transform Vehicle type to match VehicleCard expected props
  const transformedVehicles = vehicles.map(vehicle => ({
    id: vehicle.vehicle_id,
    driver: vehicle.driver || "Unassigned",
    status: vehicle.status || "idle",
    location: vehicle.location || "Unknown",
    speed: vehicle.speed || 0,
    nextStop: vehicle.next_stop || "N/A",
    packages: vehicle.packages || 0,
    eta: vehicle.eta || "--"
  }));

  const handleViewDetails = (vehicle: typeof selectedVehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedVehicle(null);
  };

  const filteredVehicles = transformedVehicles.filter(vehicle => {
    const matchesSearch = vehicle.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.driver.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Vehicle Management Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <span>Fleet Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles or drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vehicle-id" className="text-right">
                      Vehicle ID
                    </Label>
                    <Input
                      id="vehicle-id"
                      value={newVehicle.vehicle_id}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicle_id: e.target.value }))}
                      className="col-span-3"
                      placeholder="e.g., TRUCK-005"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="driver" className="text-right">
                      Driver
                    </Label>
                    <Input
                      id="driver"
                      value={newVehicle.driver}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, driver: e.target.value }))}
                      className="col-span-3"
                      placeholder="Driver name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="location" className="text-right">
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={newVehicle.location}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, location: e.target.value }))}
                      className="col-span-3"
                      placeholder="Current location"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="next-stop" className="text-right">
                      Next Stop
                    </Label>
                    <Input
                      id="next-stop"
                      value={newVehicle.next_stop}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, next_stop: e.target.value }))}
                      className="col-span-3"
                      placeholder="Next destination"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="packages" className="text-right">
                      Packages
                    </Label>
                    <Input
                      id="packages"
                      type="number"
                      value={newVehicle.packages}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, packages: parseInt(e.target.value) || 0 }))}
                      className="col-span-3"
                      placeholder="Number of packages"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="eta" className="text-right">
                      ETA
                    </Label>
                    <Input
                      id="eta"
                      value={newVehicle.eta}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, eta: e.target.value }))}
                      className="col-span-3"
                      placeholder="Estimated arrival time"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddVehicle} disabled={loading}>
                    {loading ? "Adding..." : "Add Vehicle"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Fleet Status ({filteredVehicles.length} of {transformedVehicles.length})
          </h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard 
              key={vehicle.id} 
              vehicle={vehicle} 
              onVehicleUpdate={loadVehicles}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
        {filteredVehicles.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-lg font-medium">No vehicles found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        vehicle={selectedVehicle}
        isOpen={showDetailsModal}
        onClose={handleCloseDetailsModal}
        onVehicleUpdate={loadVehicles}
      />
    </div>
  );
}