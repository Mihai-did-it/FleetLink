import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { addVehicle } from '@/lib/local-api'
import { LocationFinder } from '../common/LocationFinder'
import { MapPin, Target } from 'lucide-react'

interface AddVehicleTabProps {
  mapboxToken: string
  onVehicleAdded?: () => void
  onMapPickerToggle?: (
    active: boolean, 
    onLocationSelect: (location: { address: string; lat: number; lng: number }) => void,
    mode?: 'vehicle' | 'package' | 'general',
    title?: string
  ) => void
}

interface NewVehicle {
  vehicle_id: string
  driver: string
  location: string
  lat?: number
  lng?: number
}

export function AddVehicleTab({ mapboxToken, onVehicleAdded, onMapPickerToggle }: AddVehicleTabProps) {
  const [newVehicle, setNewVehicle] = useState<NewVehicle>({
    vehicle_id: '',
    driver: '',
    location: ''
  })
  const [loading, setLoading] = useState(false)

  const handleLocationSelect = (location: { address: string; lat: number; lng: number }) => {
    console.log('🚛 AddVehicleTab: Location selected:', location)
    
    setNewVehicle(prev => {
      const updated = {
        ...prev,
        location: location.address,
        lat: location.lat,
        lng: location.lng
      }
      console.log('🚛 AddVehicleTab: Updated newVehicle:', updated)
      return updated
    })
  }

  const handleMapPickerClick = () => {
    if (onMapPickerToggle) {
      onMapPickerToggle(true, handleLocationSelect, 'vehicle', 'Choose vehicle starting location on the map')
    }
  }

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚛 AddVehicleTab: handleAddVehicle called with:', newVehicle)
    
    if (!newVehicle.vehicle_id || !newVehicle.driver || !newVehicle.location) {
      console.log('❌ AddVehicleTab: Missing required fields:', {
        vehicle_id: !!newVehicle.vehicle_id,
        driver: !!newVehicle.driver,
        location: !!newVehicle.location,
        actualValues: {
          vehicle_id: newVehicle.vehicle_id,
          driver: newVehicle.driver,
          location: newVehicle.location,
          lat: newVehicle.lat,
          lng: newVehicle.lng
        }
      })
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      // Require lat/lng to be provided by location picker only
      if (!newVehicle.lat || !newVehicle.lng) {
        throw new Error('Please select a location on the map to provide coordinates')
      }
      const vehicleData = {
        vehicle_id: newVehicle.vehicle_id,
        driver: newVehicle.driver,
        location: newVehicle.location,
        lat: newVehicle.lat,
        lng: newVehicle.lng,
        status: 'idle' as const,
        speed: 0
      }
      console.log('🚛 AddVehicleTab: Adding vehicle with data:', vehicleData)
      const result = await addVehicle(vehicleData)
      console.log('🚛 AddVehicleTab: addVehicle result:', result)
      if (result) {
        toast({
          title: "Vehicle Added Successfully",
          description: `${newVehicle.vehicle_id} has been added to the fleet`,
        })
        
        // Reset form
        setNewVehicle({
          vehicle_id: '',
          driver: '',
          location: ''
        })
        
        console.log('🚛 AddVehicleTab: Vehicle added successfully, calling onVehicleAdded')
        onVehicleAdded?.()
      } else {
        throw new Error('Failed to add vehicle')
      }
    } catch (error) {
      console.error('❌ AddVehicleTab: Error adding vehicle:', error)
      toast({
        title: "Error Adding Vehicle",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 shadow-lg">
        <div className="p-4 border-b border-white/30">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            🚛 Add Vehicle
          </h3>
          <p className="text-slate-600 text-sm mt-1">
            Add a new vehicle to your fleet with precise location
          </p>
        </div>
        <div className="p-4">
          <form onSubmit={handleAddVehicle} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle-id" className="text-slate-700 font-medium">Vehicle ID</Label>
            <Input
              id="vehicle-id"
              placeholder="e.g., TRUCK-001"
              value={newVehicle.vehicle_id}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicle_id: e.target.value }))}
              required
              className="bg-white/80 border-white/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver" className="text-slate-700 font-medium">Driver Name</Label>
            <Input
              id="driver"
              placeholder="e.g., John Smith"
              value={newVehicle.driver}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, driver: e.target.value }))}
              required
              className="bg-white/80 border-white/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-slate-700 font-medium">Starting Location</Label>
            <div className="space-y-3">
              <LocationFinder
                mapboxToken={mapboxToken}
                placeholder="Enter USA address (e.g., 123 Main St, San Francisco CA)"
                onLocationSelect={handleLocationSelect}
                value={newVehicle.location}
              />
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-xs text-slate-500 px-2">or</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleMapPickerClick}
                className="w-full flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Pick location on map
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Adding Vehicle...' : 'Add Vehicle'}
          </Button>
        </form>
        </div>
      </div>

  </>
  )
}