// DraggableLocationPicker.tsx - Draggable marker for picking locations on map
import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Navigation, MapPin, Check } from 'lucide-react'

interface DraggableLocationPickerProps {
  mapboxToken: string
  onLocationSelect: (location: { address: string; lat: number; lng: number }) => void
  onClose: () => void
  initialCenter?: [number, number] // [lng, lat]
  title?: string
}

export function DraggableLocationPicker({
  mapboxToken,
  onLocationSelect,
  onClose,
  initialCenter = [-98.5795, 39.8283], // Center of USA
  title = "Drag the marker to select a location"
}: DraggableLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  
  const [coordinates, setCoordinates] = useState<[number, number]>(initialCenter)
  const [address, setAddress] = useState<string>('')
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = mapboxToken

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 10,
      attributionControl: false
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Create draggable marker
    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: '#3b82f6'
    })
      .setLngLat(initialCenter)
      .addTo(map.current)

    // Handle drag end
    const onDragEnd = () => {
      if (!marker.current) return
      
      const lngLat = marker.current.getLngLat()
      const newCoords: [number, number] = [lngLat.lng, lngLat.lat]
      setCoordinates(newCoords)
      
      // Reverse geocode to get address
      reverseGeocode(newCoords)
    }

    marker.current.on('dragend', onDragEnd)

    // Initial reverse geocode
    reverseGeocode(initialCenter)

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [mapboxToken, initialCenter])

  // Reverse geocode coordinates to get address
  const reverseGeocode = async (coords: [number, number]) => {
    setIsLoadingAddress(true)
    
    try {
      const [lng, lat] = coords
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        new URLSearchParams({
          access_token: mapboxToken,
          types: 'address,poi,place,locality',
          country: 'us',
          limit: '1'
        })
      )

      if (response.ok) {
        const data = await response.json()
        if (data.features && data.features.length > 0) {
          setAddress(data.features[0].place_name)
        } else {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        }
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      const [lng, lat] = coords
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    } finally {
      setIsLoadingAddress(false)
    }
  }

  // Handle location confirmation
  const handleConfirmLocation = () => {
    const [lng, lat] = coordinates
    onLocationSelect({
      address,
      lat,
      lng
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              Drag the blue marker to your desired location
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div 
            ref={mapContainer} 
            className="w-full h-full"
          />
          
          {/* Crosshair indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-8 h-8 border-2 border-blue-500 rounded-full bg-white bg-opacity-75 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Footer with coordinates and confirm button */}
        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Selected Location:</span>
              </div>
              
              {isLoadingAddress ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-blue-500"></div>
                  <span className="text-sm text-slate-500">Getting address...</span>
                </div>
              ) : (
                <div className="text-sm text-slate-900 font-medium mb-1">
                  {address}
                </div>
              )}
              
              <div className="text-xs text-slate-500 font-mono">
                Lat: {coordinates[1].toFixed(6)}, Lng: {coordinates[0].toFixed(6)}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmLocation}
                className="px-6 bg-blue-600 hover:bg-blue-700"
                disabled={isLoadingAddress}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm Location
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}