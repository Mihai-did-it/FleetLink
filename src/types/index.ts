import { type Vehicle, type Package, type DeliveryRoute } from '@/lib/local-api'

export interface VehicleWithPackages extends Vehicle {
  packages: Package[]
  deliveryRoute?: DeliveryRoute
}

export interface LocationSuggestion {
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