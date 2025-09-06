import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Clock, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { getDashboardStats } from "@/lib/api";

export function StatsOverview() {
  const [stats, setStats] = useState({
    activeVehicles: 0,
    totalVehicles: 0,
    deliveriesToday: 0,
    completedDeliveries: 0,
    avgDeliveryTime: 0,
    coveragePercentage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await getDashboardStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayStats = [
    {
      title: "Active Vehicles",
      value: loading ? "..." : stats.activeVehicles.toString(),
      subtitle: `of ${stats.totalVehicles} total`,
      icon: Truck,
      trend: "+2 from yesterday"
    },
    {
      title: "Deliveries Today",
      value: loading ? "..." : stats.deliveriesToday.toString(),
      subtitle: `${stats.completedDeliveries} completed`,
      icon: Package,
      trend: `${stats.deliveriesToday - stats.completedDeliveries} remaining`
    },
    {
      title: "Avg. Delivery Time",
      value: loading ? "..." : `${stats.avgDeliveryTime}m`,
      subtitle: "5m faster",
      icon: Clock,
      trend: "than yesterday"
    },
    {
      title: "Coverage Area",
      value: loading ? "..." : `${stats.coveragePercentage}%`,
      subtitle: "city coverage",
      icon: MapPin,
      trend: "optimal routes"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {displayStats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.subtitle}
            </p>
            <p className="text-xs text-fleet-active mt-1">
              {stat.trend}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}