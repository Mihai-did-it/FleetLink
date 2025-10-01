import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Truck, MapPin, Clock, Package, Navigation, Phone, User, AlertTriangle, CheckCircle, Pause } from "lucide-react";
import { Vehicle, updateVehicleStatus, assignRoute } from "@/lib/api";
import { VehicleDeleteButton } from "./VehicleDeleteButton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface VehicleDetailsModalProps {
  vehicle: {
    id: string;
    driver: string;
    status: "active" | "idle" | "warning" | "danger";
    location: string;
    speed: number;
    nextStop: string;
    packages: number;
    eta: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdate?: () => void;
}

const statusConfig = {
  active: {
    color: "bg-fleet-active text-fleet-active-foreground",
    label: "On Route",
    icon: CheckCircle
  },
  idle: {
    color: "bg-fleet-idle text-fleet-idle-foreground", 
    label: "Idle",
    icon: Pause
  },
  warning: {
    color: "bg-fleet-warning text-fleet-warning-foreground",
    label: "Delayed",
    icon: AlertTriangle
  },
  danger: {
    color: "bg-fleet-danger text-fleet-danger-foreground",
    label: "Alert",
    icon: AlertTriangle
  }
};

export function VehicleDetailsModal({ vehicle, isOpen, onClose, onVehicleUpdate }: VehicleDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!vehicle) return null;

  const status = statusConfig[vehicle.status];
  const StatusIcon = status.icon;

  const handleStatusUpdate = async (newStatus: typeof vehicle.status) => {
    setLoading(true);
    try {
      await updateVehicleStatus(vehicle.id, newStatus);
      toast({
        title: "Status Updated",
        description: `${vehicle.id} status changed to ${newStatus}`,
      });
      onVehicleUpdate?.();
      onClose();
    } catch (error) {
      console.error("Failed to update vehicle status:", error);
      toast({
        title: "Error",
        description: "Failed to update vehicle status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRoute = async () => {
    setLoading(true);
    try {
      await assignRoute(vehicle.id, "New optimized route assigned via details view");
      toast({
        title: "Route Assigned",
        description: `New route assigned to ${vehicle.id}`,
      });
      onVehicleUpdate?.();
      onClose();
    } catch (error) {
      console.error("Failed to assign route:", error);
      toast({
        title: "Error",
        description: "Failed to assign route",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyContact = () => {
    toast({
      title: "Emergency Contact",
      description: `Attempting to contact ${vehicle.driver}...`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Truck className="h-6 w-6" />
            <span>Vehicle Details - {vehicle.id}</span>
            <Badge className={`${status.color} flex items-center space-x-1`}>
              <StatusIcon className="h-3 w-3" />
              <span>{status.label}</span>
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Driver Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Driver Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-lg">{vehicle.driver}</p>
                  <p className="text-sm text-muted-foreground">Driver ID: DRV-{vehicle.id.split('-')[1]}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleEmergencyContact}>
                  <Phone className="h-4 w-4 mr-2" />
                  Contact
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Current Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Location</p>
                  <p className="font-medium">{vehicle.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Speed</p>
                  <p className="font-medium">{vehicle.speed} mph</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Packages on Board</p>
                  <p className="font-medium flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>{vehicle.packages} packages</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Next Stop ETA</p>
                  <p className="font-medium flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{vehicle.eta}</span>
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Next Destination</p>
                <p className="font-medium">{vehicle.nextStop}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={handleAssignRoute}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Assign New Route</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleStatusUpdate("active")}
                  disabled={loading || vehicle.status === "active"}
                  className="flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Set Active</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleStatusUpdate("idle")}
                  disabled={loading || vehicle.status === "idle"}
                  className="flex items-center space-x-2"
                >
                  <Pause className="h-4 w-4" />
                  <span>Set Idle</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleStatusUpdate("warning")}
                  disabled={loading || vehicle.status === "warning"}
                  className="flex items-center space-x-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Mark Warning</span>
                </Button>
                <VehicleDeleteButton vehicleId={vehicle.id} onVehicleUpdate={onVehicleUpdate} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={async () => {
              if (vehicle && window.confirm(`Delete vehicle ${vehicle.id} and all its packages?`)) {
                const { deleteVehicleCascade } = await import('@/lib/deleteVehicleCascade');
                await deleteVehicleCascade(vehicle.id);
                window.location.reload();
              }
            }}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Vehicle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
