import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { addVehicle, geocodeAddress } from '@/lib/local-api'
import { LocationFinder } from '../common/LocationFinder'

interface AddVehicleTabProps {
  mapboxToken: string
  onVehicleAdded?: () => void
}

interface NewVehicle {
  vehicle_id: string
  driver: string
  location: string
  lat?: number
  lng?: number
}

export function AddVehicleTab({ mapboxToken, onVehicleAdded }: AddVehicleTabProps) {
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
      // Use coordinates from location finder if available, otherwise geocode
      let lat = newVehicle.lat
      let lng = newVehicle.lng
      
      console.log('🚛 AddVehicleTab: Coordinates check:', { lat, lng })
      
      if (!lat || !lng) {
        console.log('🚛 AddVehicleTab: No coordinates, geocoding address:', newVehicle.location)
        const coords = await geocodeAddress(newVehicle.location, mapboxToken)
        if (!coords) {
          throw new Error('Could not find location coordinates')
        }
        lat = coords.lat
        lng = coords.lng
        console.log('🚛 AddVehicleTab: Geocoded coordinates:', { lat, lng })
      }

      const vehicleData = {
        vehicle_id: newVehicle.vehicle_id,
        driver: newVehicle.driver,
        location: newVehicle.location,
        lat,
        lng,
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚛 Add Vehicle
        </CardTitle>
        <CardDescription>
          Add a new vehicle to your fleet with precise location
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddVehicle} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle-id">Vehicle ID</Label>
            <Input
              id="vehicle-id"
              placeholder="e.g., TRUCK-001"
              value={newVehicle.vehicle_id}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicle_id: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver">Driver Name</Label>
            <Input
              id="driver"
              placeholder="e.g., John Smith"
              value={newVehicle.driver}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, driver: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Starting Location</Label>
            <LocationFinder
              mapboxToken={mapboxToken}
              placeholder="Enter address or location..."
              onLocationSelect={handleLocationSelect}
              value={newVehicle.location}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Adding Vehicle...' : 'Add Vehicle'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}