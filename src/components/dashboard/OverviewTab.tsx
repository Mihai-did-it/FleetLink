import { StatsOverview } from "./StatsOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Plus, Filter, TrendingUp, Clock, MapPin, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { getAlerts, getRecentActivity, assignRoute, getVehicles, startSimulation, addTrafficEvent } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "./ActionLogger";

export function OverviewTab() {
  const [alerts, setAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [alertsData, activityData, vehiclesData] = await Promise.all([
        getAlerts(),
        getRecentActivity(),
        getVehicles()
      ]);
      setAlerts(alertsData);
      setRecentActivity(activityData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error("Failed to load overview data:", error);
      toast({
        title: "Error",
        description: "Failed to load overview data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    logAction("Refreshing dashboard data...", "info");
    await loadData();
    toast({
      title: "Data Refreshed",
      description: "All dashboard data has been updated.",
    });
    logAction("Dashboard data refreshed successfully", "success");
  };

  const handleNewRoute = async () => {
    if (!selectedVehicle) {
      toast({
        title: "Error",
        description: "Please select a vehicle for route assignment.",
        variant: "destructive",
      });
      logAction("Route assignment failed: No vehicle selected", "error");
      return;
    }

    try {
      logAction(`Assigning route to ${selectedVehicle}...`, "info");
      await assignRoute(selectedVehicle, "Optimized route via Dashboard Quick Action");
      toast({
        title: "Route Assigned",
        description: `New optimized route assigned to ${selectedVehicle}`,
      });
      logAction(`Route successfully assigned to ${selectedVehicle}`, "success");
      setShowRouteDialog(false);
      setSelectedVehicle("");
      await loadData(); // Refresh data
    } catch (error) {
      console.error("Failed to create new route:", error);
      toast({
        title: "Error",
        description: "Failed to assign route",
        variant: "destructive",
      });
      logAction(`Route assignment failed for ${selectedVehicle}`, "error");
    }
  };

  const handleStartSimulation = async () => {
    try {
      logAction("Starting fleet simulation...", "info");
      await startSimulation();
      toast({
        title: "Simulation Started",
        description: "Fleet simulation is now running with live updates.",
      });
      logAction("Fleet simulation started successfully", "success");
      await loadData(); // Refresh data
    } catch (error) {
      console.error("Failed to start simulation:", error);
      toast({
        title: "Error",
        description: "Failed to start simulation",
        variant: "destructive",
      });
      logAction("Failed to start fleet simulation", "error");
    }
  };

  const handleCreateAlert = async () => {
    try {
      logAction("Creating new traffic alert...", "info");
      await addTrafficEvent({
        type: 'heavy_traffic',
        location: 'Dashboard Quick Action',
        severity: 'medium',
        duration: 30
      });
      toast({
        title: "Traffic Alert Created",
        description: "New traffic alert has been added to the system.",
      });
      logAction("Traffic alert created successfully", "success");
      await loadData(); // Refresh data
    } catch (error) {
      console.error("Failed to create alert:", error);
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive",
      });
      logAction("Failed to create traffic alert", "error");
    }
  };

  const handleGenerateReport = () => {
    // Simulate report generation
    logAction("Generating fleet performance report...", "info");
    const stats = {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.status === 'active').length,
      totalAlerts: alerts.length,
      recentActivity: recentActivity.length
    };
    
    toast({
      title: "Report Generated",
      description: `Fleet Report: ${stats.activeVehicles}/${stats.totalVehicles} vehicles active, ${stats.totalAlerts} alerts, ${stats.recentActivity} recent activities.`,
    });
    logAction(`Fleet report generated: ${stats.activeVehicles}/${stats.totalVehicles} active vehicles`, "success");
  };

  return (
    <div className="space-y-6">
      <StatsOverview />
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Active Alerts</span>
            </CardTitle>
            <Badge variant="outline">{loading ? "..." : alerts.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading alerts...</div>
              ) : alerts.length === 0 ? (
                <div className="text-sm text-muted-foreground">No active alerts</div>
              ) : (
                alerts.slice(0, 5).map((alert: any, index) => (
                  <div key={alert.id || index} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === 'warning' ? 'bg-fleet-warning' :
                      alert.type === 'success' ? 'bg-fleet-active' : 
                      alert.type === 'info' ? 'bg-primary' : 'bg-fleet-danger'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                    <Badge variant={alert.type === 'warning' ? 'destructive' : 'secondary'} className="text-xs">
                      {alert.type}
                    </Badge>
                  </div>
                ))
              )}
              {!loading && alerts.length > 5 && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => toast({ title: "All Alerts", description: `Showing all ${alerts.length} alerts...` })}>
                  View {alerts.length - 5} more alerts
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast({ title: "Activity Log", description: "Showing all recent fleet activities..." })}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading activity...</div>
              ) : recentActivity.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent activity</div>
              ) : (
                recentActivity.slice(0, 5).map((activity: any, index) => (
                  <div key={activity.id || index} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="w-2 h-2 rounded-full mt-2 bg-primary" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{activity.driver}</span>
                        <span>•</span>
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
            <DialogTrigger asChild>
              <Button className="h-24 flex-col space-y-2" disabled={loading}>
                <Plus className="h-6 w-6" />
                <span>Assign Route</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Assign New Route</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="vehicle-select" className="text-sm font-medium">
                    Select Vehicle
                  </label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle: any) => (
                        <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                          {vehicle.vehicle_id} - {vehicle.driver || 'No Driver'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowRouteDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleNewRoute}>
                    Assign Route
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={handleStartSimulation} className="h-24 flex-col space-y-2" disabled={loading}>
            <TrendingUp className="h-6 w-6" />
            <span>Start Simulation</span>
          </Button>
          
          <Button variant="outline" onClick={handleCreateAlert} className="h-24 flex-col space-y-2" disabled={loading}>
            <Bell className="h-6 w-6" />
            <span>Create Alert</span>
          </Button>
          
          <Button variant="outline" onClick={handleGenerateReport} className="h-24 flex-col space-y-2" disabled={loading}>
            <MapPin className="h-6 w-6" />
            <span>Generate Report</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}