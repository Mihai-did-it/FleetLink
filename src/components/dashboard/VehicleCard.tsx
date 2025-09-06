import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Truck, MapPin, Clock, Package, MoreHorizontal, Navigation, Pause, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateVehicleStatus, assignRoute } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface VehicleCardProps {
  vehicle: {
    id: string;
    driver: string;
    status: "active" | "idle" | "warning" | "danger";
    location: string;
    speed: number;
    nextStop: string;
    packages: number;
    eta: string;
  };
  onVehicleUpdate?: () => void;
}

const statusConfig = {
  active: {
    color: "bg-fleet-active text-fleet-active-foreground",
    label: "On Route"
  },
  idle: {
    color: "bg-fleet-idle text-fleet-idle-foreground", 
    label: "Idle"
  },
  warning: {
    color: "bg-fleet-warning text-fleet-warning-foreground",
    label: "Delayed"
  },
  danger: {
    color: "bg-fleet-danger text-fleet-danger-foreground",
    label: "Alert"
  }
};

export function VehicleCard({ vehicle, onVehicleUpdate }: VehicleCardProps) {
  const status = statusConfig[vehicle.status];
  const { toast } = useToast();
  
  const handleStatusUpdate = async (newStatus: typeof vehicle.status) => {
    try {
      await updateVehicleStatus(vehicle.id, newStatus);
      toast({
        title: "Status Updated",
        description: `${vehicle.id} status changed to ${newStatus}`,
      });
      onVehicleUpdate?.();
    } catch (error) {
      console.error("Failed to update vehicle status:", error);
      toast({
        title: "Error",
        description: "Failed to update vehicle status",
        variant: "destructive",
      });
    }
  };

  const handleAssignRoute = async () => {
    try {
      await assignRoute(vehicle.id, "Optimized route assigned");
      toast({
        title: "Route Assigned",
        description: `New route assigned to ${vehicle.id}`,
      });
      onVehicleUpdate?.();
    } catch (error) {
      console.error("Failed to assign route:", error);
      toast({
        title: "Error",
        description: "Failed to assign route",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4" />
            <span>{vehicle.id}</span>
          </div>
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge className={cn("text-xs", status.color)}>
            {status.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAssignRoute}>
                <Navigation className="h-4 w-4 mr-2" />
                Assign Route
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate("active")}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Set Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate("idle")}>
                <Pause className="h-4 w-4 mr-2" />
                Set Idle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate("warning")}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Mark as Warning
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{vehicle.driver}</p>
            <p className="text-xs text-muted-foreground flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {vehicle.location}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Speed</p>
              <p className="font-medium">{vehicle.speed} mph</p>
            </div>
            <div>
              <p className="text-muted-foreground">Packages</p>
              <p className="font-medium flex items-center">
                <Package className="h-3 w-3 mr-1" />
                {vehicle.packages}
              </p>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">Next Stop</p>
            <p className="text-sm font-medium">{vehicle.nextStop}</p>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <Clock className="h-3 w-3 mr-1" />
              ETA: {vehicle.eta}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}