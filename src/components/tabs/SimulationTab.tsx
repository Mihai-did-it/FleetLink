import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { startSimulation, stopSimulation } from '@/lib/local-api'
import { type VehicleWithPackages } from '@/types'
import { Play, Pause, Square, Settings } from 'lucide-react'

interface SimulationTabProps {
  vehicles: VehicleWithPackages[]
  isSimulationActive: boolean
  onSimulationToggle: (active: boolean) => void
}

export function SimulationTab({ 
  vehicles, 
  isSimulationActive, 
  onSimulationToggle 
}: SimulationTabProps) {
  const [loading, setLoading] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState([1])

  const handleStartSimulation = async () => {
    setLoading(true)
    try {
      const result = await startSimulation()
      if (result.success) {
        onSimulationToggle(true)
        toast({
          title: "Simulation Started",
          description: result.message,
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Failed to Start Simulation",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStopSimulation = async () => {
    setLoading(true)
    try {
      const result = await stopSimulation()
      if (result.success) {
        onSimulationToggle(false)
        toast({
          title: "Simulation Stopped",
          description: result.message,
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Failed to Stop Simulation",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const activeVehicles = vehicles.filter(v => v.status === 'active')
  const idleVehicles = vehicles.filter(v => v.status === 'idle')
  const totalPackages = vehicles.reduce((sum, v) => sum + (v.packages?.length || 0), 0)
  const inTransitPackages = vehicles.reduce((sum, v) => 
    sum + (v.packages?.filter(p => p.status === 'in-transit').length || 0), 0
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ▶️ Fleet Simulation
        </CardTitle>
        <CardDescription>
          Control and monitor fleet simulation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simulation Controls */}
        <div className="space-y-4">
          <div className="flex gap-3">
            {!isSimulationActive ? (
              <Button
                onClick={handleStartSimulation}
                disabled={loading || vehicles.length === 0}
                className="flex-1"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                {loading ? 'Starting...' : 'Start Simulation'}
              </Button>
            ) : (
              <Button
                onClick={handleStopSimulation}
                disabled={loading}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <Square className="w-4 h-4 mr-2" />
                {loading ? 'Stopping...' : 'Stop Simulation'}
              </Button>
            )}
          </div>

          {vehicles.length === 0 && (
            <p className="text-sm text-slate-500 text-center">
              Add vehicles and packages before starting simulation
            </p>
          )}
        </div>

        {/* Simulation Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Simulation Status</h3>
            <Badge variant={isSimulationActive ? "default" : "secondary"}>
              {isSimulationActive ? "Running" : "Stopped"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {activeVehicles.length}
              </div>
              <div className="text-sm text-green-700">Active Vehicles</div>
            </div>
            
            <div className="text-center p-3 bg-slate-50 rounded-lg border">
              <div className="text-2xl font-bold text-slate-600">
                {idleVehicles.length}
              </div>
              <div className="text-sm text-slate-600">Idle Vehicles</div>
            </div>
          </div>

          {totalPackages > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Package Delivery Progress</span>
                <span>{inTransitPackages}/{totalPackages} in transit</span>
              </div>
              <Progress 
                value={(inTransitPackages / totalPackages) * 100} 
                className="h-2"
              />
            </div>
          )}
        </div>

        {/* Simulation Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <h3 className="font-semibold text-slate-800">Settings</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="speed">Simulation Speed: {simulationSpeed[0]}x</Label>
              <Slider
                id="speed"
                min={0.5}
                max={5}
                step={0.5}
                value={simulationSpeed}
                onValueChange={setSimulationSpeed}
                className="w-full"
                disabled={isSimulationActive}
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0.5x (Slow)</span>
                <span>1x (Normal)</span>
                <span>5x (Fast)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Vehicles List */}
        {activeVehicles.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Active Vehicles</h3>
            <div className="space-y-2">
              {activeVehicles.map((vehicle) => (
                <div key={vehicle.vehicle_id} className="p-3 bg-white border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-slate-800">
                        {vehicle.vehicle_id}
                      </div>
                      <div className="text-sm text-slate-600">
                        Driver: {vehicle.driver}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(vehicle.progress || 0)}%</span>
                    </div>
                    <Progress 
                      value={vehicle.progress || 0} 
                      className="h-1.5"
                    />
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    Speed: {vehicle.speed || 0} mph • Location: {vehicle.location}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulation Info */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">How Simulation Works</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Vehicles follow optimized delivery routes</p>
            <p>• Package statuses update as vehicles progress</p>
            <p>• Real-time vehicle tracking on the map</p>
            <p>• Automatic delivery completion at destinations</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}