import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InteractiveMapWithRouting } from '@/components/dashboard/InteractiveMapWithRouting';
import { RouteOptimizationPanel } from '@/components/dashboard/RouteOptimizationPanel';
import { MapPin, Route, Settings, Info } from 'lucide-react';

export function RoutingDemo() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">FleetLink Routing System</h1>
        <p className="text-muted-foreground">
          Real-time route optimization with Mapbox Directions API
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-700">
            <Info className="h-5 w-5" />
            <span>Routing Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Map Features:</h4>
              <ul className="text-sm space-y-1">
                <li>• Real-time vehicle tracking</li>
                <li>• Package delivery checkpoints</li>
                <li>• Optimized route visualization</li>
                <li>• Interactive markers with details</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Routing Features:</h4>
              <ul className="text-sm space-y-1">
                <li>• Mapbox Directions API integration</li>
                <li>• Multi-waypoint optimization</li>
                <li>• Delivery time estimation</li>
                <li>• Route management dashboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Interactive Map</span>
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center space-x-2">
            <Route className="h-4 w-4" />
            <span>Route Management</span>
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Setup Guide</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <InteractiveMapWithRouting />
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <RouteOptimizationPanel />
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapbox Setup Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">1. Get Your Mapbox Token</h3>
                  <p className="text-muted-foreground mb-2">
                    Visit <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">mapbox.com/tokens</a> to create a public access token.
                  </p>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                    pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6InlvdXJfdG9rZW5faGVyZSJ9...
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">2. Environment Configuration</h3>
                  <p className="text-muted-foreground mb-2">
                    Add your token to your environment variables:
                  </p>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                    VITE_MAPBOX_TOKEN=your_token_here
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">3. API Permissions</h3>
                  <p className="text-muted-foreground mb-2">
                    Ensure your token has the following scopes enabled:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Directions API</li>
                    <li>Maps API</li>
                    <li>Geocoding API (optional)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">4. Usage Limits</h3>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                    <p className="text-yellow-800 text-sm">
                      <strong>Free Tier Limits:</strong> Mapbox provides 50,000 free requests per month for the Directions API. 
                      Monitor your usage at the Mapbox dashboard to avoid unexpected charges.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">5. Route Optimization Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Current Implementation:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Basic route calculation</li>
                        <li>• Multiple waypoints support</li>
                        <li>• Distance & time estimation</li>
                        <li>• Visual route rendering</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Potential Enhancements:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Real-time traffic data</li>
                        <li>• Route optimization algorithms</li>
                        <li>• Alternative route suggestions</li>
                        <li>• Turn-by-turn navigation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}