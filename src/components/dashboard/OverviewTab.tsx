import { StatsOverview } from "./StatsOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, Filter, TrendingUp, Clock, MapPin } from "lucide-react";

export function OverviewTab() {
  const alerts = [
    { id: 1, message: "TRUCK-003 experiencing traffic delays", type: "warning", time: "2 min ago" },
    { id: 2, message: "New delivery request - Priority", type: "info", time: "5 min ago" },
    { id: 3, message: "TRUCK-001 completed delivery", type: "success", time: "8 min ago" }
  ];

  const recentActivity = [
    { id: 1, action: "Route assigned to TRUCK-002", driver: "Sarah Chen", time: "1 min ago" },
    { id: 2, action: "Delivery completed", driver: "Mike Johnson", time: "5 min ago" },
    { id: 3, action: "Vehicle maintenance reminder", driver: "David Rodriguez", time: "12 min ago" },
  ];

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
            <Badge variant="outline">{alerts.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
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
              ))}
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
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
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
              ))}
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
          <Button className="h-24 flex-col space-y-2">
            <Plus className="h-6 w-6" />
            <span>New Route</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col space-y-2">
            <Filter className="h-6 w-6" />
            <span>Filter Vehicles</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col space-y-2">
            <Bell className="h-6 w-6" />
            <span>View Alerts</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col space-y-2">
            <TrendingUp className="h-6 w-6" />
            <span>Reports</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}