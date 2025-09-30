// QuickAddVehicleModal.tsx - Modal for collecting vehicle details after location selection
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Truck, User, X } from 'lucide-react'

interface QuickAddVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLocation: {
    address: string
    lat: number
    lng: number
  }
  onSubmit: (vehicleData: {
    vehicle_id: string
    driver: string
    location: string
    lat: number
    lng: number
  }) => void
  isLoading?: boolean
}

export function QuickAddVehicleModal({
  isOpen,
  onClose,
  selectedLocation,
  onSubmit,
  isLoading = false
}: QuickAddVehicleModalProps) {
  const [vehicleData, setVehicleData] = useState({
    vehicle_id: `VEH-${Date.now()}`,
    driver: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!vehicleData.vehicle_id.trim() || !vehicleData.driver.trim()) {
      return
    }

    onSubmit({
      vehicle_id: vehicleData.vehicle_id,
      driver: vehicleData.driver,
      location: selectedLocation.address,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    })
  }

  const handleClose = () => {
    setVehicleData({
      vehicle_id: `VEH-${Date.now()}`,
      driver: ''
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Truck className="h-4 w-4 text-white" />
            </div>
            Add New Vehicle
          </DialogTitle>
          <DialogDescription>
            Complete the vehicle details for the selected location
          </DialogDescription>
        </DialogHeader>

        {/* Selected Location Display */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-blue-900 mb-1">
                  Selected Location
                </div>
                <div className="text-sm text-blue-700 break-words">
                  {selectedLocation.address}
                </div>
                <div className="text-xs text-blue-600 font-mono mt-1">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle_id" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehicle ID
            </Label>
            <Input
              id="vehicle_id"
              value={vehicleData.vehicle_id}
              onChange={(e) => setVehicleData(prev => ({ ...prev, vehicle_id: e.target.value }))}
              placeholder="e.g., VEH-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Driver Name
            </Label>
            <Input
              id="driver"
              value={vehicleData.driver}
              onChange={(e) => setVehicleData(prev => ({ ...prev, driver: e.target.value }))}
              placeholder="e.g., John Smith"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || !vehicleData.vehicle_id.trim() || !vehicleData.driver.trim()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Adding...
                </div>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Add Vehicle
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}