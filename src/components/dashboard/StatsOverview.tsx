import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Clock, MapPin } from "lucide-react";

export function StatsOverview() {
  const stats = [
    {
      title: "Active Vehicles",
      value: "8",
      subtitle: "of 10 total",
      icon: Truck,
      trend: "+2 from yesterday"
    },
    {
      title: "Deliveries Today",
      value: "47",
      subtitle: "12 completed",
      icon: Package,
      trend: "35 remaining"
    },
    {
      title: "Avg. Delivery Time",
      value: "24m",
      subtitle: "5m faster",
      icon: Clock,
      trend: "than yesterday"
    },
    {
      title: "Coverage Area",
      value: "85%",
      subtitle: "city coverage",
      icon: MapPin,
      trend: "optimal routes"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
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