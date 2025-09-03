import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./OverviewTab";
import { MapTab } from "./MapTab";
import { VehiclesTab } from "./VehiclesTab";
import { SimulationTab } from "./SimulationTab";
import { BarChart3, Map, Truck, Play, Route } from "lucide-react";

export function DashboardView() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center space-x-2">
            <Map className="h-4 w-4" />
            <span>Fleet Map</span>
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center space-x-2">
            <Truck className="h-4 w-4" />
            <span>Vehicles</span>
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>Simulation</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        
        <TabsContent value="map">
          <MapTab />
        </TabsContent>
        
        <TabsContent value="vehicles">
          <VehiclesTab />
        </TabsContent>
        
        <TabsContent value="simulation">
          <SimulationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}