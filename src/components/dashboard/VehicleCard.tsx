import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Clock, Package, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const status = statusConfig[vehicle.status];
  
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
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
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