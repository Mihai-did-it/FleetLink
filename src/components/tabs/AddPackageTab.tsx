import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { addPackage, type Vehicle } from '@/lib/local-api'
import { LocationFinder } from '../common/LocationFinder'
import { Target } from 'lucide-react'

interface AddPackageTabProps {
  mapboxToken: string
  vehicles: Vehicle[]
  onPackageAdded?: () => void
  onMapPickerToggle?: (
    active: boolean, 
    onLocationSelect: (location: { address: string; lat: number; lng: number }) => void,
    mode?: 'vehicle' | 'package' | 'general',
    title?: string
  ) => void
}

interface NewPackage {
  package_id: string
  vehicle_id: string
  destination: string
  destination_lat?: number
  destination_lng?: number
  weight: number
  priority: 'low' | 'medium' | 'high'
  recipient_name: string
  package_type: string
}

export function AddPackageTab({ mapboxToken, vehicles, onPackageAdded, onMapPickerToggle }: AddPackageTabProps) {
  const [newPackage, setNewPackage] = useState<NewPackage>({
    package_id: '',
    vehicle_id: '',
    destination: '',
    weight: 1,
    priority: 'medium',
    recipient_name: '',
    package_type: ''
  })
  const [loading, setLoading] = useState(false)

  const handleLocationSelect = (location: { address: string; lat: number; lng: number }) => {
    setNewPackage(prev => ({
      ...prev,
      destination: location.address,
      destination_lat: location.lat,
      destination_lng: location.lng
    }))
  }

  const handleMapPickerClick = () => {
    if (onMapPickerToggle) {
      onMapPickerToggle(true, handleLocationSelect, 'package', 'Choose package delivery location on the map')
    }
  }

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPackage.package_id || !newPackage.vehicle_id || !newPackage.destination || !newPackage.recipient_name) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      // Use coordinates from location finder if available
      let lat = newPackage.destination_lat
      let lng = newPackage.destination_lng
      
      if (!lat || !lng) {
        // This should not happen with LocationFinder, but fallback just in case
        throw new Error('Location coordinates are required')
      }

      const result = await addPackage({
        package_id: newPackage.package_id,
        vehicle_id: newPackage.vehicle_id,
        destination: newPackage.destination,
        destination_lat: lat,
        destination_lng: lng,
        weight: newPackage.weight,
        priority: newPackage.priority,
        recipient_name: newPackage.recipient_name,
        package_type: newPackage.package_type
      })

      if (result) {
        toast({
          title: "Package Added Successfully",
          description: `${newPackage.package_id} has been assigned to ${newPackage.vehicle_id}`,
        })
        
        // Reset form
        setNewPackage({
          package_id: '',
          vehicle_id: '',
          destination: '',
          weight: 1,
          priority: 'medium',
          recipient_name: '',
          package_type: ''
        })
        
        onPackageAdded?.()
      } else {
        throw new Error('Failed to add package')
      }
    } catch (error) {
      console.error('❌ Error adding package:', error)
      toast({
        title: "Error Adding Package",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 shadow-lg max-h-[calc(100vh-120px)] overflow-y-auto">
        <div className="p-3 border-b border-white/30">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            📦 Add Package
          </h3>
          <p className="text-slate-600 text-xs mt-1">
            Assign a new package to a vehicle for delivery
          </p>
        </div>
        <div className="p-3">
          <form onSubmit={handleAddPackage} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="package-id" className="text-slate-700 font-medium text-sm">Package ID</Label>
            <Input
              id="package-id"
              placeholder="e.g., PKG-001"
              value={newPackage.package_id}
              onChange={(e) => setNewPackage(prev => ({ ...prev, package_id: e.target.value }))}
              required
              className="bg-white/80 border-white/50 h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="vehicle-select" className="text-slate-700 font-medium text-sm">Assign to Vehicle</Label>
            <Select value={newPackage.vehicle_id} onValueChange={(value) => setNewPackage(prev => ({ ...prev, vehicle_id: value }))}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                    {vehicle.vehicle_id} - {vehicle.driver}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="destination" className="text-slate-700 font-medium text-sm">Delivery Destination</Label>
            <div className="space-y-2">
              <LocationFinder
                mapboxToken={mapboxToken}
                placeholder="Enter USA delivery address"
                onLocationSelect={handleLocationSelect}
                value={newPackage.destination}
              />
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-xs text-slate-500 px-2">or</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMapPickerClick}
                className="w-full flex items-center gap-2 h-8"
              >
                <Target className="h-3 w-3" />
                Pick on map
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="weight" className="text-slate-700 font-medium text-sm">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={newPackage.weight}
                onChange={(e) => setNewPackage(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                required
                className="bg-white/80 border-white/50 h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="priority" className="text-slate-700 font-medium text-sm">Priority</Label>
              <Select value={newPackage.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewPackage(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recipient" className="text-slate-700 font-medium text-sm">Recipient Name</Label>
            <Input
              id="recipient"
              placeholder="e.g., John Doe"
              value={newPackage.recipient_name}
              onChange={(e) => setNewPackage(prev => ({ ...prev, recipient_name: e.target.value }))}
              required
              className="bg-white/80 border-white/50 h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="package-type" className="text-slate-700 font-medium text-sm">Package Type (Optional)</Label>
            <Input
              id="package-type"
              placeholder="e.g., Electronics, Documents"
              value={newPackage.package_type}
              onChange={(e) => setNewPackage(prev => ({ ...prev, package_type: e.target.value }))}
              className="bg-white/80 border-white/50 h-8 text-sm"
            />
          </div>

          <Button 
            type="submit" 
            size="sm"
            className="w-full" 
            disabled={loading || vehicles.length === 0}
          >
            {loading ? 'Adding Package...' : 'Add Package'}
          </Button>
          
          {vehicles.length === 0 && (
            <p className="text-sm text-slate-500 text-center">
              Add a vehicle first before creating packages
            </p>
          )}
        </form>
        </div>
      </div>
    </>
  )
}