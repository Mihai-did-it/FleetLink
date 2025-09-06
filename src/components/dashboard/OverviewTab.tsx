import { StatsOverview } from "./StatsOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, Filter, TrendingUp, Clock, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { getAlerts, getRecentActivity, assignRoute } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function OverviewTab() {
  const [alerts, setAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [alertsData, activityData] = await Promise.all([
        getAlerts(),
        getRecentActivity()
      ]);
      setAlerts(alertsData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error("Failed to load overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewRoute = async () => {
    try {
      // This would typically open a dialog to select vehicle and route details
      // For now, we'll simulate assigning a route to the first available vehicle
      await assignRoute("TRUCK-001", "New optimized route");
      toast({
        title: "Route Created",
        description: "New route has been assigned successfully.",
      });
      loadData(); // Refresh data
    } catch (error) {
      console.error("Failed to create new route:", error);
      toast({
        title: "Error",
        description: "Failed to create new route",
        variant: "destructive",
      });
    }
  };

  const handleViewAlerts = () => {
    toast({
      title: "Alerts View",
      description: "Opening detailed alerts view...",
    });
  };

  const handleViewReports = () => {
    toast({
      title: "Reports View",
      description: "Opening analytics and reports dashboard...",
    });
  };

  const handleFilterVehicles = () => {
    toast({
      title: "Filter Applied",
      description: "Vehicle filtering options applied.",
    });
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
                alerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === 'warning' ? 'bg-fleet-warning' :
                      alert.type === 'success' ? 'bg-fleet-active' : 'bg-primary'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                ))
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
            <Button variant="ghost" size="sm" onClick={() => toast({ title: "View All", description: "Opening full activity log..." })}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading activity...</div>
              ) : recentActivity.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent activity</div>
              ) : (
                recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
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
          <Button onClick={handleNewRoute} className="h-24 flex-col space-y-2" disabled={loading}>
            <Plus className="h-6 w-6" />
            <span>New Route</span>
          </Button>
          <Button variant="outline" onClick={handleFilterVehicles} className="h-24 flex-col space-y-2" disabled={loading}>
            <Filter className="h-6 w-6" />
            <span>Filter Vehicles</span>
          </Button>
          <Button variant="outline" onClick={handleViewAlerts} className="h-24 flex-col space-y-2" disabled={loading}>
            <Bell className="h-6 w-6" />
            <span>View Alerts</span>
          </Button>
          <Button variant="outline" onClick={handleViewReports} className="h-24 flex-col space-y-2" disabled={loading}>
            <TrendingUp className="h-6 w-6" />
            <span>Reports</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}