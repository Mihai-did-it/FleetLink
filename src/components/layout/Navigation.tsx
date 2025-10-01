import { Button } from "@/components/ui/button";
import { Truck, Users, Route, BarChart3 } from "lucide-react";
import { Trash } from "lucide-react";
import { deleteVehicleCascade } from "@/lib/deleteVehicleCascade";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NavigationProps {
  activeView: "dashboard" | "driver";
  onViewChange: (view: "dashboard" | "driver") => void;
}

export function Navigation({ activeView, onViewChange }: NavigationProps) {
  const { toast } = useToast();
  const handleDeleteVehicle = async () => {
    // Prompt for vehicle ID
    const vehicleId = prompt("Enter Vehicle ID to delete:");
    if (!vehicleId) return;
    try {
      await deleteVehicleCascade(vehicleId);
      toast({
        title: "Vehicle Deleted",
        description: `Vehicle ${vehicleId} and its packages have been deleted`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete vehicle",
        variant: "destructive",
      });
    }
  };
  return (
    <nav className="flex items-center justify-between bg-card border-b px-6 py-4">
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-2">
          <Truck className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            FleetLink
          </h1>
        </div>
        
        <div className="flex space-x-1">
          <Button
            variant={activeView === "dashboard" ? "default" : "ghost"}
            onClick={() => onViewChange("dashboard")}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Dispatcher</span>
          </Button>
          <Button
            variant={activeView === "driver" ? "default" : "ghost"}
            onClick={() => onViewChange("driver")}
            className="flex items-center space-x-2"
          >
            <Route className="h-4 w-4" />
            <span>Driver</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
  <Button variant="default" size="sm" onClick={() => alert('TEST BUTTON CLICKED!')}>TEST BUTTON</Button>
        <div className="flex items-center space-x-2 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-fleet-active rounded-full"></div>
            <span>8 Active</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-fleet-idle rounded-full"></div>
            <span>2 Idle</span>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Team
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDeleteVehicle}>
          <Trash className="h-4 w-4 mr-2" />
          Delete Vehicle
        </Button>
      </div>
    </nav>
  );
}