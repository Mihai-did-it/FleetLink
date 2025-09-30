import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MapPin, Search, X } from 'lucide-react'

interface LocationSuggestion {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
  place_type: string[]
  properties: {
    address?: string
    category?: string
  }
  context?: Array<{
    id: string
    text: string
  }>
}

interface LocationFinderProps {
  mapboxToken: string
  placeholder?: string
  value?: string
  onLocationSelect: (location: { address: string; lat: number; lng: number }) => void
  className?: string
}

export function LocationFinder({ 
  mapboxToken, 
  placeholder = "Search for a location...", 
  value = "",
  onLocationSelect,
  className = ""
}: LocationFinderProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])
  const debounceRef = useRef<NodeJS.Timeout>()

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Debounced search function
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    console.log('🔍 LocationFinder: Starting search for:', searchQuery)
    setIsLoading(true)
    
    try {
      // MapBox Geocoding API with comprehensive types and proximity
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        new URLSearchParams({
          access_token: mapboxToken,
          limit: '8',
          types: 'country,region,postcode,district,place,locality,neighborhood,address,poi',
          autocomplete: 'true',
          // Add proximity to improve results (optional - can be user's location)
          // proximity: '-122.4194,37.7749', // SF coordinates as example
        })
      
      console.log('🔍 LocationFinder: API URL:', url)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 LocationFinder: API response:', data)
      
      if (data.features) {
        console.log('🔍 LocationFinder: Found', data.features.length, 'suggestions')
        console.log('🔍 LocationFinder: Setting suggestions and showSuggestions=true')
        setSuggestions(data.features)
        setShowSuggestions(true)
        setSelectedIndex(-1)
      } else {
        console.log('🔍 LocationFinder: No features in response')
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('❌ LocationFinder: Location search error:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce search by 300ms
    debounceRef.current = setTimeout(() => {
      searchLocations(newQuery)
    }, 300)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    console.log('🎯 LocationFinder: handleSuggestionSelect called with:', suggestion)
    
    const [lng, lat] = suggestion.center
    
    console.log('🎯 LocationFinder: Suggestion selected:', {
      place_name: suggestion.place_name,
      coordinates: [lng, lat],
      suggestion
    })
    
    setQuery(suggestion.place_name)
    setShowSuggestions(false)
    setSuggestions([])
    
    const locationData = {
      address: suggestion.place_name,
      lat,
      lng
    }
    
    console.log('📍 LocationFinder: Calling onLocationSelect with:', locationData)
    onLocationSelect(locationData)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  // Clear suggestions when clicking outside
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        console.log('🔍 LocationFinder: Click outside detected, closing suggestions')
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format suggestion display with context
  const formatSuggestion = (suggestion: LocationSuggestion) => {
    const { place_name, place_type, context } = suggestion
    
    // Extract relevant context (city, state, country)
    const cityState = context?.find(c => c.id.startsWith('place') || c.id.startsWith('region'))?.text
    const country = context?.find(c => c.id.startsWith('country'))?.text
    
    return {
      primary: place_name.split(',')[0], // Main address
      secondary: place_name.split(',').slice(1).join(',').trim() || `${cityState || ''} ${country || ''}`.trim(),
      type: place_type[0]
    }
  }

  // Get icon for location type
  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'address': return '🏠'
      case 'poi': return '📍'
      case 'place': case 'locality': return '🏙️'
      case 'neighborhood': return '🏘️'
      case 'region': return '🗺️'
      case 'country': return '🌍'
      default: return '📍'
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true)
          }}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => {
              setQuery('')
              setSuggestions([])
              setShowSuggestions(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Debug info */}
      {query.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Debug: Query="{query}", Suggestions={suggestions.length}, Show={showSuggestions.toString()}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto border shadow-lg bg-white">
          <div className="p-1">
            {/* Debug button for first suggestion */}
            {suggestions.length > 0 && (
              <button
                type="button"
                className="w-full p-2 text-left text-xs bg-yellow-100 border-b border-yellow-200 hover:bg-yellow-200"
                onClick={() => {
                  console.log('🧪 DEBUG: Force select first suggestion')
                  handleSuggestionSelect(suggestions[0])
                }}
              >
                🧪 DEBUG: Click to select first result: {suggestions[0].place_name}
              </button>
            )}
            {suggestions.map((suggestion, index) => {
              const formatted = formatSuggestion(suggestion)
              return (
                <div
                  key={suggestion.id}
                  ref={el => suggestionRefs.current[index] = el}
                  className={`flex items-start gap-3 p-3 cursor-pointer rounded-md transition-colors ${
                    index === selectedIndex 
                      ? 'bg-blue-50 border-blue-200 border' 
                      : 'hover:bg-slate-50'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault() // Prevent the input from losing focus
                    console.log('🖱️ LocationFinder: MouseDown on suggestion:', suggestion.place_name)
                    handleSuggestionSelect(suggestion)
                  }}
                  onClick={(e) => {
                    e.preventDefault() // Prevent any default behavior
                    console.log('🖱️ LocationFinder: Click on suggestion:', suggestion.place_name)
                  }}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">
                    {getLocationIcon(formatted.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {formatted.primary}
                    </div>
                    {formatted.secondary && (
                      <div className="text-sm text-slate-500 truncate">
                        {formatted.secondary}
                      </div>
                    )}
                    <div className="text-xs text-slate-400 capitalize">
                      {formatted.type.replace('_', ' ')}
                    </div>
                  </div>
                  <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && query.length >= 3 && !isLoading && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg bg-white">
          <div className="p-4 text-center text-slate-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <div className="text-sm">No locations found</div>
            <div className="text-xs">Try a different search term</div>
          </div>
        </Card>
      )}
    </div>
  )
}