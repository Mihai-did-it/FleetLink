import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MapPin, Search, X, Navigation } from 'lucide-react'

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
    short_code?: string
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
  placeholder = "Search for a location in the USA...", 
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

  // Enhanced search function focused on USA locations
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    
    try {
      // Enhanced MapBox Geocoding API with USA focus and better filtering
      const params = new URLSearchParams({
        access_token: mapboxToken,
        limit: '6',
        types: 'address,poi,place,locality,neighborhood',
        autocomplete: 'true',
        country: 'us', // Restrict to USA only
        proximity: '-98.5795,39.8283', // Geographic center of USA for better relevance
        language: 'en'
      })

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?${params}`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        // Filter and sort results for better USA relevance
        const filteredResults = data.features
          .filter((feature: LocationSuggestion) => {
            // Ensure result is in USA
            const country = feature.context?.find(c => c.id.startsWith('country'))
            return country?.short_code === 'us' || country?.text === 'United States'
          })
          .slice(0, 5) // Limit to 5 best results
        
        setSuggestions(filteredResults)
        setShowSuggestions(filteredResults.length > 0)
        setSelectedIndex(-1)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Location search error:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input change with faster debouncing for better UX
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Faster debounce for better responsiveness
    debounceRef.current = setTimeout(() => {
      searchLocations(newQuery)
    }, 200)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const [lng, lat] = suggestion.center
    
    setQuery(suggestion.place_name)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedIndex(-1)
    
    const locationData = {
      address: suggestion.place_name,
      lat,
      lng
    }
    
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

  // Handle clicks outside to close suggestions
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Enhanced formatting for USA addresses
  const formatSuggestion = (suggestion: LocationSuggestion) => {
    const { place_name, place_type, context } = suggestion
    
    // Extract state and city information
    const state = context?.find(c => c.id.startsWith('region'))?.text
    const city = context?.find(c => c.id.startsWith('place'))?.text
    const postcode = context?.find(c => c.id.startsWith('postcode'))?.text
    
    // Split place name for better formatting
    const parts = place_name.split(',').map(part => part.trim())
    const primary = parts[0]
    
    // Build secondary info with state prioritized
    let secondary = ''
    if (parts.length > 1) {
      secondary = parts.slice(1).join(', ')
    } else if (city && state) {
      secondary = `${city}, ${state}`
    } else if (state) {
      secondary = state
    }
    
    // Add postal code if available and relevant
    if (postcode && place_type.includes('address')) {
      secondary = secondary ? `${secondary} ${postcode}` : postcode
    }
    
    return {
      primary,
      secondary,
      type: place_type[0],
      state: state || ''
    }
  }

  // Get enhanced icons for location types
  const getLocationIcon = (type: string, hasState: boolean) => {
    switch (type) {
      case 'address': return '🏠'
      case 'poi': return '🏢'
      case 'place': return '🏙️'
      case 'locality': return '🏘️'
      case 'neighborhood': return '�'
      default: return hasState ? '📍' : '🇺🇸'
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
          className="pl-10 pr-10 h-11"
          autoComplete="off"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100"
            onClick={() => {
              setQuery('')
              setSuggestions([])
              setShowSuggestions(false)
              inputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-blue-500"></div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-[150%] mt-2 max-h-96 overflow-y-auto border shadow-xl bg-white">
          <div className="p-2">
            {suggestions.map((suggestion, index) => {
              const formatted = formatSuggestion(suggestion)
              return (
                <div
                  key={suggestion.id}
                  ref={el => suggestionRefs.current[index] = el}
                  className={`flex items-start gap-3 p-4 cursor-pointer rounded-lg transition-all duration-150 ${
                    index === selectedIndex 
                      ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm' 
                      : 'hover:bg-slate-50 hover:shadow-sm'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSuggestionSelect(suggestion)
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="text-xl mt-1 flex-shrink-0">
                    {getLocationIcon(formatted.type, !!formatted.state)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-base leading-tight mb-1">
                      {formatted.primary}
                    </div>
                    {formatted.secondary && (
                      <div className="text-sm text-slate-600 leading-tight mb-2">
                        {formatted.secondary}
                      </div>
                    )}
                    <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                      <span className="bg-slate-100 px-2 py-1 rounded-full font-medium">
                        {formatted.type.replace('_', ' ')}
                      </span>
                      {formatted.state && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {formatted.state}
                        </span>
                      )}
                    </div>
                  </div>
                  <Navigation className="h-5 w-5 text-slate-400 flex-shrink-0 mt-2" />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Enhanced no results message */}
      {showSuggestions && suggestions.length === 0 && query.length >= 2 && !isLoading && (
        <Card className="absolute z-50 w-[150%] mt-2 border shadow-xl bg-white">
          <div className="p-8 text-center text-slate-500">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-slate-400" />
            </div>
            <div className="text-base font-medium mb-2">No USA locations found</div>
            <div className="text-sm mb-3">Try searching for a city, address, or landmark</div>
            <div className="text-sm text-slate-400 space-y-1">
              <div>Examples:</div>
              <div className="text-xs bg-slate-50 px-3 py-2 rounded-lg">
                "San Francisco CA" • "123 Main St" • "Central Park"
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}