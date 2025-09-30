// QuickAddPackageModal.tsx - Modal for collecting package details after location selection
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Package, User, Weight, Truck, X } from 'lucide-react'
import { type Vehicle } from '@/lib/local-api'

interface QuickAddPackageModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLocation: {
    address: string
    lat: number
    lng: number
  }
  vehicles: Vehicle[]
  onSubmit: (packageData: {
    package_id: string
    vehicle_id: string
    destination: string
    destination_lat: number
    destination_lng: number
    weight: number
    priority: 'low' | 'medium' | 'high'
    recipient_name: string
    package_type: string
  }) => void
  isLoading?: boolean
}

export function QuickAddPackageModal({
  isOpen,
  onClose,
  selectedLocation,
  vehicles,
  onSubmit,
  isLoading = false
}: QuickAddPackageModalProps) {
  const [packageData, setPackageData] = useState({
    package_id: `PKG-${Date.now()}`,
    vehicle_id: '',
    weight: 1,
    priority: 'medium' as 'low' | 'medium' | 'high',
    recipient_name: '',
    package_type: 'Standard'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!packageData.package_id.trim() || 
        !packageData.vehicle_id || 
        !packageData.recipient_name.trim() || 
        packageData.weight <= 0) {
      return
    }

    onSubmit({
      package_id: packageData.package_id,
      vehicle_id: packageData.vehicle_id,
      destination: selectedLocation.address,
      destination_lat: selectedLocation.lat,
      destination_lng: selectedLocation.lng,
      weight: packageData.weight,
      priority: packageData.priority,
      recipient_name: packageData.recipient_name,
      package_type: packageData.package_type
    })
  }

  const handleClose = () => {
    setPackageData({
      package_id: `PKG-${Date.now()}`,
      vehicle_id: '',
      weight: 1,
      priority: 'medium',
      recipient_name: '',
      package_type: 'Standard'
    })
    onClose()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-orange-600 bg-orange-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            Add New Package
          </DialogTitle>
          <DialogDescription>
            Complete the package details for the selected delivery location
          </DialogDescription>
        </DialogHeader>

        {/* Selected Location Display */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-orange-900 mb-1">
                  Delivery Location
                </div>
                <div className="text-sm text-orange-700 break-words">
                  {selectedLocation.address}
                </div>
                <div className="text-xs text-orange-600 font-mono mt-1">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Package Details Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="package_id" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Package ID
              </Label>
              <Input
                id="package_id"
                value={packageData.package_id}
                onChange={(e) => setPackageData(prev => ({ ...prev, package_id: e.target.value }))}
                placeholder="e.g., PKG-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_id" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Assign to Vehicle
              </Label>
              <Select
                value={packageData.vehicle_id}
                onValueChange={(value) => setPackageData(prev => ({ ...prev, vehicle_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{vehicle.vehicle_id}</span>
                        <span className="text-sm text-gray-500">({vehicle.driver})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Recipient Name
            </Label>
            <Input
              id="recipient_name"
              value={packageData.recipient_name}
              onChange={(e) => setPackageData(prev => ({ ...prev, recipient_name: e.target.value }))}
              placeholder="e.g., Jane Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2">
                <Weight className="h-4 w-4" />
                Weight (lbs)
              </Label>
              <Input
                id="weight"
                type="number"
                min="0.1"
                step="0.1"
                value={packageData.weight}
                onChange={(e) => setPackageData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 1 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(packageData.priority).split(' ')[1]}`}></div>
                Priority
              </Label>
              <Select
                value={packageData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') => setPackageData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      High Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      Medium Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Low Priority
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="package_type">Package Type (Optional)</Label>
            <Input
              id="package_type"
              value={packageData.package_type}
              onChange={(e) => setPackageData(prev => ({ ...prev, package_type: e.target.value }))}
              placeholder="e.g., Electronics, Documents, Food"
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
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              disabled={isLoading || !packageData.package_id.trim() || !packageData.vehicle_id || !packageData.recipient_name.trim()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Adding...
                </div>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Add Package
                </>
              )}
            </Button>
          </div>
        </form>

        {vehicles.length === 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <span className="text-sm font-medium">No vehicles available</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Add a vehicle first before creating packages.
              </p>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}