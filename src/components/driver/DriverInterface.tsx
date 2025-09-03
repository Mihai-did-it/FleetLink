import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Package, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export function DriverInterface() {
  const currentRoute = {
    driver: "Mike Johnson",
    vehicle: "TRUCK-001",
    currentStop: "Downtown Distribution Center",
    nextStop: "Westfield Mall",
    packageCount: 8,
    eta: "2:45 PM",
    totalStops: 12,
    completedStops: 4
  };

  const upcomingStops = [
    { location: "Westfield Mall", packages: 3, time: "2:45 PM", status: "next" },
    { location: "City Center Office", packages: 2, time: "3:15 PM", status: "pending" },
    { location: "Riverside Apartments", packages: 1, time: "3:45 PM", status: "pending" },
    { location: "Tech Campus Building A", packages: 2, time: "4:20 PM", status: "pending" }
  ];

  return (
    <div className="space-y-6">
      {/* Driver Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>{currentRoute.driver} - {currentRoute.vehicle}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Stop {currentRoute.completedStops + 1} of {currentRoute.totalStops}
              </p>
            </div>
            <Badge variant="outline" className="bg-fleet-active text-fleet-active-foreground">
              On Route
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Location</p>
              <p className="font-medium flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-fleet-active" />
                {currentRoute.currentStop}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Next Stop</p>
              <p className="font-medium">{currentRoute.nextStop}</p>
              <p className="text-xs text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                ETA: {currentRoute.eta}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Packages Remaining</p>
              <p className="font-medium text-2xl">{currentRoute.packageCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Navigation className="h-5 w-5" />
              <span>Navigation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-48 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
                <div className="text-center space-y-2">
                  <Navigation className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Route Navigation</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button className="flex-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Navigation
                </Button>
                <Button variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Stops */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Stops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingStops.map((stop, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{stop.location}</p>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Package className="h-3 w-3 mr-1" />
                      {stop.packages} packages
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium">{stop.time}</p>
                    {index === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Next
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Current Stop
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}