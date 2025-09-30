import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Route, Package as PackageIcon, Clock, MapPin, Truck, CheckCircle, AlertTriangle } from "lucide-react";
import { getVehicles, getPackages, type Vehicle, type Package } from "@/lib/api";
import { formatDuration, formatDistance } from "@/lib/routing";

interface RouteOptimizationPanelProps {
  onRouteUpdate?: (vehicleId: string, route: any) => void;
}

export function RouteOptimizationPanel({ onRouteUpdate }: RouteOptimizationPanelProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesData, packagesData] = await Promise.all([
        getVehicles(),
        getPackages()
      ]);
      setVehicles(vehiclesData);
      setPackages(packagesData);
    } catch (error) {
      console.error("Failed to load route data:", error);
    } finally {
      setLoading(false);
    }
  };

  const optimizeRoute = async (vehicleId: string) => {
    setOptimizing(vehicleId);
    try {
      // Simulate route optimization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would call your routing API
      const optimizedRoute = {
        vehicleId,
        totalDistance: Math.floor(Math.random() * 50) + 10, // km
        totalDuration: Math.floor(Math.random() * 7200) + 1800, // seconds
        waypoints: packages
          .filter(pkg => pkg.status === "pending")
          .slice(0, 4)
          .map((pkg, index) => ({
            id: pkg.id,
            address: pkg.destination.address,
            lat: pkg.destination.lat,
            lng: pkg.destination.lng,
            estimatedArrival: new Date(Date.now() + (index + 1) * 30 * 60000).toLocaleTimeString(),
            isCompleted: false
          }))
      };

      // Update vehicle with optimized route
      const updatedVehicles = vehicles.map(vehicle => 
        vehicle.vehicle_id === vehicleId 
          ? { ...vehicle, route: optimizedRoute }
          : vehicle
      );
      setVehicles(updatedVehicles);

      if (onRouteUpdate) {
        onRouteUpdate(vehicleId, optimizedRoute);
      }
    } catch (error) {
      console.error("Route optimization failed:", error);
    } finally {
      setOptimizing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'idle': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Route className="h-5 w-5" />
            <span>Route Optimization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Routes Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Route className="h-5 w-5" />
            <span>Route Optimization & Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Active Vehicles</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {vehicles.filter(v => v.status === 'active').length}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <PackageIcon className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium">Pending Deliveries</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {packages.filter(p => p.status === 'pending').length}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Completed Today</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {packages.filter(p => p.status === 'delivered').length}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium">High Priority</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {packages.filter(p => p.priority === 'high' && p.status !== 'delivered').length}
              </div>
            </div>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <div key={vehicle.vehicle_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status || 'idle')}`}></div>
                      <div>
                        <div className="font-medium">{vehicle.vehicle_id}</div>
                        <div className="text-sm text-muted-foreground">{vehicle.driver}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => optimizeRoute(vehicle.vehicle_id)}
                      disabled={optimizing === vehicle.vehicle_id || vehicle.status === 'idle'}
                    >
                      {optimizing === vehicle.vehicle_id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Route className="h-4 w-4 mr-2" />
                          Optimize Route
                        </>
                      )}
                    </Button>
                  </div>

                  {vehicle.route && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{formatDistance((vehicle.route.totalDistance || 0) * 1000)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(vehicle.route.totalDuration || 0)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <PackageIcon className="h-4 w-4" />
                          <span>{vehicle.route.waypoints?.length || 0} stops</span>
                        </div>
                      </div>

                      {vehicle.route.waypoints && vehicle.route.waypoints.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Delivery Schedule:</div>
                          {vehicle.route.waypoints.map((waypoint, index) => (
                            <div key={waypoint.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{waypoint.address}</div>
                                  <div className="text-xs text-muted-foreground">ETA: {waypoint.estimatedArrival}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {waypoint.isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-orange-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!vehicle.route && vehicle.status !== 'idle' && (
                    <div className="text-sm text-muted-foreground italic">
                      No route assigned. Click "Optimize Route" to generate delivery schedule.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Unassigned Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PackageIcon className="h-5 w-5" />
            <span>Unassigned Packages</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {packages.filter(pkg => pkg.status === 'pending').map((pkg) => (
                <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <PackageIcon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{pkg.id}</div>
                      <div className="text-sm text-muted-foreground">{pkg.destination.address}</div>
                      <div className="text-xs text-muted-foreground">{pkg.recipientName}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getPriorityColor(pkg.priority)}>
                      {pkg.priority}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      ETA: {pkg.estimatedDeliveryTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}