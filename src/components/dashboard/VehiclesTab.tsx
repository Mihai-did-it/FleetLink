import { VehicleCard } from "./VehicleCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search, Plus, Truck } from "lucide-react";
import { useState } from "react";

export function VehiclesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const mockVehicles = [
    {
      id: "TRUCK-001",
      driver: "Mike Johnson",
      status: "active" as const,
      location: "Downtown District",
      speed: 35,
      nextStop: "Westfield Mall",
      packages: 8,
      eta: "2:45 PM"
    },
    {
      id: "TRUCK-002", 
      driver: "Sarah Chen",
      status: "active" as const,
      location: "Industrial Zone",
      speed: 28,
      nextStop: "Tech Campus",
      packages: 12,
      eta: "3:15 PM"
    },
    {
      id: "TRUCK-003",
      driver: "David Rodriguez",
      status: "warning" as const,
      location: "Highway 101",
      speed: 15,
      nextStop: "City Center",
      packages: 6,
      eta: "4:20 PM"
    },
    {
      id: "TRUCK-004",
      driver: "Emma Wilson",
      status: "idle" as const,
      location: "Depot",
      speed: 0,
      nextStop: "Awaiting Assignment",
      packages: 0,
      eta: "--"
    }
  ];

  const filteredVehicles = mockVehicles.filter(vehicle => {
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Fleet Status ({filteredVehicles.length} of {mockVehicles.length})
          </h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
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
    </div>
  );
}