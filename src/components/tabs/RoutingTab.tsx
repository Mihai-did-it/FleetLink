import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { getAllDeliveryRoutes, type DeliveryRoute } from '@/lib/local-api'
import { formatDistance, formatDuration } from '@/lib/routing'
import { type VehicleWithPackages } from '@/types'

interface RoutingTabProps {
  vehicles: VehicleWithPackages[]
  onGenerateRoutes: () => void
  showRoutes: boolean
  onToggleRoutes: (show: boolean) => void
}

export function RoutingTab({ 
  vehicles, 
  onGenerateRoutes, 
  showRoutes, 
  onToggleRoutes 
}: RoutingTabProps) {
  const [loading, setLoading] = useState(false)
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])

  const loadRoutes = async () => {
    try {
      const allRoutes = await getAllDeliveryRoutes()
      setRoutes(allRoutes)
    } catch (error) {
      console.error('❌ Failed to load routes:', error)
    }
  }

  React.useEffect(() => {
    loadRoutes()
  }, [])

  const handleGenerateRoutes = async () => {
    setLoading(true)
    try {
      await onGenerateRoutes()
      await loadRoutes() // Refresh routes after generation
      toast({
        title: "Routes Generated",
        description: "Delivery routes have been optimized for all vehicles",
      })
    } catch (error) {
      toast({
        title: "Route Generation Failed",
        description: "Failed to generate routes. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const vehiclesWithPackages = vehicles.filter(v => v.packages && v.packages.length > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🗺️ Route Management
        </CardTitle>
        <CardDescription>
          Generate and manage optimal delivery routes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Route Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-routes">Show Routes on Map</Label>
              <p className="text-sm text-slate-500">
                Toggle route visibility on the map
              </p>
            </div>
            <Switch
              id="show-routes"
              checked={showRoutes}
              onCheckedChange={onToggleRoutes}
            />
          </div>

          <Button 
            onClick={handleGenerateRoutes}
            disabled={loading || vehiclesWithPackages.length === 0}
            className="w-full"
            size="lg"
          >
            {loading ? 'Generating Routes...' : '🚀 Generate Optimal Routes'}
          </Button>

          {vehiclesWithPackages.length === 0 && (
            <p className="text-sm text-slate-500 text-center">
              Assign packages to vehicles before generating routes
            </p>
          )}
        </div>

        {/* Route Statistics */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Route Statistics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {vehiclesWithPackages.length}
              </div>
              <div className="text-sm text-slate-600">Active Vehicles</div>
            </div>
            
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {routes.length}
              </div>
              <div className="text-sm text-slate-600">Generated Routes</div>
            </div>
          </div>

          {routes.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-700">Route Details</h4>
              <div className="space-y-2">
                {routes.map((route) => {
                  const vehicle = vehicles.find(v => v.vehicle_id === route.vehicle_id)
                  return (
                    <div key={route.id} className="p-3 bg-white border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-slate-800">
                            {route.vehicle_id}
                          </div>
                          <div className="text-sm text-slate-600">
                            {vehicle?.driver || 'Unknown Driver'}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {route.waypoints?.length || 0} stops
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Distance:</span>
                          <div className="font-medium">
                            {formatDistance(route.total_distance)}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Duration:</span>
                          <div className="font-medium">
                            {formatDuration(route.total_duration)}
                          </div>
                        </div>
                      </div>

                      {route.is_optimized && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            ✓ Optimized
                          </Badge>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Route Optimization Info */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Route Optimization</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Routes are optimized for shortest travel time</p>
            <p>• High priority packages are delivered first</p>
            <p>• Real road conditions are considered</p>
            <p>• Multiple delivery stops are efficiently sequenced</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}