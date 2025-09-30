// MapLocationPicker.tsx - Integrated location picker that uses the main map
import React, { useState, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Check, X, Navigation } from 'lucide-react'

interface MapLocationPickerProps {
  map: mapboxgl.Map | null
  isActive: boolean
  onLocationSelect: (location: { address: string; lat: number; lng: number }) => void
  onCancel: () => void
  title?: string
  mapboxToken: string
  mode?: 'vehicle' | 'package' | 'general'
}

export function MapLocationPicker({
  map,
  isActive,
  onLocationSelect,
  onCancel,
  title = "Click on the map to select a location",
  mapboxToken,
  mode = 'general'
}: MapLocationPickerProps) {
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null)
  const [address, setAddress] = useState<string>('')
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [tempMarker, setTempMarker] = useState<mapboxgl.Marker | null>(null)

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

  // Handle map click
  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!isActive || !map) return

    const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
    setSelectedCoords(coords)
    
    // Remove existing temp marker
    if (tempMarker) {
      tempMarker.remove()
    }

    // Create new temporary marker
    const newMarker = new mapboxgl.Marker({
      color: '#10b981', // Green color for selection
      scale: 1.2
    })
      .setLngLat(coords)
      .addTo(map)

    setTempMarker(newMarker)
    
    // Reverse geocode to get address
    reverseGeocode(coords)
  }

  // Set up map click listener when active
  useEffect(() => {
    if (!map || !isActive) return

    // Change cursor to crosshair
    map.getCanvas().style.cursor = 'crosshair'
    
    // Add click listener
    map.on('click', handleMapClick)

    return () => {
      // Cleanup
      map.off('click', handleMapClick)
      map.getCanvas().style.cursor = ''
      
      // Remove temp marker
      if (tempMarker) {
        tempMarker.remove()
        setTempMarker(null)
      }
    }
  }, [map, isActive, tempMarker])

  // Cleanup on unmount or cancel
  useEffect(() => {
    if (!isActive) {
      if (tempMarker) {
        tempMarker.remove()
        setTempMarker(null)
      }
      setSelectedCoords(null)
      setAddress('')
    }
  }, [isActive, tempMarker])

  // Handle confirm location
  const handleConfirmLocation = () => {
    if (!selectedCoords) return

    const [lng, lat] = selectedCoords
    onLocationSelect({
      address,
      lat,
      lng
    })

    // Cleanup
    if (tempMarker) {
      tempMarker.remove()
      setTempMarker(null)
    }
    setSelectedCoords(null)
    setAddress('')
  }

  // Handle cancel
  const handleCancel = () => {
    if (tempMarker) {
      tempMarker.remove()
      setTempMarker(null)
    }
    setSelectedCoords(null)
    setAddress('')
    onCancel()
  }

  if (!isActive) return null

  // Get mode-specific styling
  const getModeConfig = () => {
    switch (mode) {
      case 'vehicle':
        return {
          icon: '🚛',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-900',
          accentColor: 'text-blue-600',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          cancelColor: 'text-blue-700 border-blue-300 hover:bg-blue-100'
        }
      case 'package':
        return {
          icon: '📦',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-900',
          accentColor: 'text-orange-600',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          cancelColor: 'text-orange-700 border-orange-300 hover:bg-orange-100'
        }
      default:
        return {
          icon: '📍',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-900',
          accentColor: 'text-blue-600',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          cancelColor: 'text-blue-700 border-blue-300 hover:bg-blue-100'
        }
    }
  }

  const modeConfig = getModeConfig()

  return (
    <>
      {/* Overlay to indicate map picking mode */}
      <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40">
        <Card className={`${modeConfig.bgColor} ${modeConfig.borderColor} shadow-lg`}>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 ${modeConfig.buttonColor} rounded-full flex items-center justify-center`}>
                <span className="text-white text-lg">{modeConfig.icon}</span>
              </div>
              <div>
                <div className={`font-semibold ${modeConfig.textColor}`}>{title}</div>
                <div className={`text-sm ${modeConfig.accentColor}`}>Click anywhere on the map</div>
              </div>
            </div>
            
            {selectedCoords && (
              <div className={`border-t ${modeConfig.borderColor} pt-3 mt-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className={`h-4 w-4 ${modeConfig.accentColor}`} />
                  <span className={`text-sm font-medium ${modeConfig.textColor}`}>Selected Location:</span>
                </div>
                
                {isLoadingAddress ? (
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`animate-spin rounded-full h-4 w-4 border-2 border-opacity-30 ${modeConfig.accentColor.replace('text-', 'border-')} border-t-current`}></div>
                    <span className={`text-sm ${modeConfig.accentColor}`}>Getting address...</span>
                  </div>
                ) : (
                  <div className={`text-sm ${modeConfig.textColor} font-medium mb-2`}>
                    {address}
                  </div>
                )}
                
                <div className={`text-xs ${modeConfig.accentColor} font-mono mb-3`}>
                  Lat: {selectedCoords[1].toFixed(6)}, Lng: {selectedCoords[0].toFixed(6)}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleCancel}
                    className={modeConfig.cancelColor}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleConfirmLocation}
                    disabled={isLoadingAddress}
                    className={modeConfig.buttonColor}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Confirm
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Status badge */}
      <div className="fixed top-24 right-6 z-40">
        <Badge variant="secondary" className={`${modeConfig.bgColor} ${modeConfig.textColor} ${modeConfig.borderColor}`}>
          <span className="mr-1">{modeConfig.icon}</span>
          Map Picking Mode
        </Badge>
      </div>
    </>
  )
}