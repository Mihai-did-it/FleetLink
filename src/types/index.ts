
export interface Vehicle {
  vehicle_id: string;
  name: string;
  status: string;
  progress?: number;
  [key: string]: any;
}

export interface Package {
  package_id: string;
  vehicle_id?: string;
  status: string;
  destination_lat?: number;
  destination_lng?: number;
  [key: string]: any;
}

export interface DeliveryRoute {
  route_id: string;
  vehicle_id: string;
  waypoints: Array<{ lat: number; lng: number }>;
  [key: string]: any;
}

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