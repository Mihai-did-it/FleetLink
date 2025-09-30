// Local mock database for testing without Supabase
import { type Vehicle, type Package, type DeliveryRoute } from './supabase'

// Re-export types for convenience
export type { Vehicle, Package, DeliveryRoute } from './supabase'

// In-memory storage
let vehicles: Vehicle[] = [
  {
    id: '1',
    vehicle_id: 'TRUCK-001',
    driver: 'Mike Johnson',
    status: 'idle',
    lat: 37.7749,
    lng: -122.4194,
    speed: 0,
    location: 'San Francisco Downtown',
    progress: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2', 
    vehicle_id: 'TRUCK-002',
    driver: 'Sarah Chen',
    status: 'idle',
    lat: 37.7849,
    lng: -122.4094,
    speed: 0,
    location: 'San Francisco Mission',
    progress: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

let packages: Package[] = [
  {
    id: '1',
    package_id: 'PKG-001',
    vehicle_id: 'TRUCK-001',
    destination: '123 Market St, San Francisco, CA',
    destination_lat: 37.7879,
    destination_lng: -122.3972,
    weight: 5.5,
    status: 'pending',
    priority: 'high',
    recipient_name: 'John Doe',
    package_type: 'Electronics',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    package_id: 'PKG-002', 
    vehicle_id: 'TRUCK-001',
    destination: '456 Mission St, San Francisco, CA',
    destination_lat: 37.7869,
    destination_lng: -122.3962,
    weight: 2.3,
    status: 'pending',
    priority: 'medium',
    recipient_name: 'Jane Smith',
    package_type: 'Documents',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

let routes: DeliveryRoute[] = []

// Mock subscription callbacks
let vehicleCallbacks: ((vehicles: Vehicle[]) => void)[] = []
let packageCallbacks: ((packages: Package[]) => void)[] = []

// Helper function to notify subscribers
const notifyVehicleSubscribers = () => {
  vehicleCallbacks.forEach(callback => callback([...vehicles]))
}

const notifyPackageSubscribers = () => {
  packageCallbacks.forEach(callback => callback([...packages]))
}

// ==================== VEHICLES API ====================

export async function getVehicles(): Promise<Vehicle[]> {
  console.log('📦 [LOCAL] Getting vehicles:', vehicles.length)
  return [...vehicles]
}

export async function addVehicle(vehicleData: {
  vehicle_id: string
  driver: string
  lat: number
  lng: number
  location: string
  status?: Vehicle['status']
  speed?: number
}): Promise<Vehicle | null> {
  try {
    // Check if vehicle ID already exists
    if (vehicles.find(v => v.vehicle_id === vehicleData.vehicle_id)) {
      throw new Error('Vehicle ID already exists')
    }

    const newVehicle: Vehicle = {
      id: `local-${Date.now()}`,
      vehicle_id: vehicleData.vehicle_id,
      driver: vehicleData.driver,
      lat: vehicleData.lat,
      lng: vehicleData.lng,
      location: vehicleData.location,
      status: vehicleData.status || 'idle',
      speed: vehicleData.speed || 0,
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    vehicles.push(newVehicle)
    console.log('✅ [LOCAL] Vehicle added:', newVehicle.vehicle_id)
    
    // Notify subscribers
    setTimeout(() => notifyVehicleSubscribers(), 100)
    
    return newVehicle
  } catch (error) {
    console.error('❌ [LOCAL] Failed to add vehicle:', error)
    return null
  }
}

export async function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
  try {
    const index = vehicles.findIndex(v => v.vehicle_id === vehicleId)
    if (index === -1) {
      throw new Error('Vehicle not found')
    }

    vehicles[index] = {
      ...vehicles[index],
      ...updates,
      updated_at: new Date().toISOString()
    }

    console.log('✅ [LOCAL] Vehicle updated:', vehicleId)
    notifyVehicleSubscribers()
    
    return vehicles[index]
  } catch (error) {
    console.error('❌ [LOCAL] Failed to update vehicle:', error)
    return null
  }
}

export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  try {
    const index = vehicles.findIndex(v => v.vehicle_id === vehicleId)
    if (index === -1) {
      throw new Error('Vehicle not found')
    }

    vehicles.splice(index, 1)
    
    // Also remove packages for this vehicle
    packages = packages.filter(p => p.vehicle_id !== vehicleId)
    
    console.log('✅ [LOCAL] Vehicle deleted:', vehicleId)
    notifyVehicleSubscribers()
    notifyPackageSubscribers()
    
    return true
  } catch (error) {
    console.error('❌ [LOCAL] Failed to delete vehicle:', error)
    return false
  }
}

// ==================== PACKAGES API ====================

export async function getPackages(): Promise<Package[]> {
  console.log('📦 [LOCAL] Getting packages:', packages.length)
  return [...packages]
}

export async function getPackagesByVehicle(vehicleId: string): Promise<Package[]> {
  return packages.filter(p => p.vehicle_id === vehicleId)
}

export async function addPackage(packageData: {
  package_id: string
  vehicle_id: string
  destination: string
  destination_lat: number
  destination_lng: number
  weight: number
  priority?: Package['priority']
  recipient_name?: string
  package_type?: string
}): Promise<Package | null> {
  try {
    // Check if vehicle exists
    if (!vehicles.find(v => v.vehicle_id === packageData.vehicle_id)) {
      throw new Error('Vehicle not found')
    }

    // Check if package ID already exists
    if (packages.find(p => p.package_id === packageData.package_id)) {
      throw new Error('Package ID already exists')
    }

    const newPackage: Package = {
      id: `local-pkg-${Date.now()}`,
      package_id: packageData.package_id,
      vehicle_id: packageData.vehicle_id,
      destination: packageData.destination,
      destination_lat: packageData.destination_lat,
      destination_lng: packageData.destination_lng,
      weight: packageData.weight,
      status: 'pending',
      priority: packageData.priority || 'medium',
      recipient_name: packageData.recipient_name,
      package_type: packageData.package_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    packages.push(newPackage)
    console.log('✅ [LOCAL] Package added:', newPackage.package_id)
    
    // Notify subscribers
    setTimeout(() => notifyPackageSubscribers(), 100)
    
    return newPackage
  } catch (error) {
    console.error('❌ [LOCAL] Failed to add package:', error)
    return null
  }
}

export async function updatePackageStatus(packageId: string, status: Package['status']): Promise<Package | null> {
  try {
    const index = packages.findIndex(p => p.package_id === packageId)
    if (index === -1) {
      throw new Error('Package not found')
    }

    packages[index] = {
      ...packages[index],
      status,
      updated_at: new Date().toISOString()
    }

    console.log('✅ [LOCAL] Package status updated:', packageId, status)
    notifyPackageSubscribers()
    
    return packages[index]
  } catch (error) {
    console.error('❌ [LOCAL] Failed to update package status:', error)
    return null
  }
}

export async function deletePackage(packageId: string): Promise<boolean> {
  try {
    const index = packages.findIndex(p => p.package_id === packageId)
    if (index === -1) {
      throw new Error('Package not found')
    }

    packages.splice(index, 1)
    console.log('✅ [LOCAL] Package deleted:', packageId)
    notifyPackageSubscribers()
    
    return true
  } catch (error) {
    console.error('❌ [LOCAL] Failed to delete package:', error)
    return false
  }
}

// ==================== ROUTES API ====================

export async function saveDeliveryRoute(routeData: {
  vehicle_id: string
  route_geometry: any
  total_distance: number
  total_duration: number
  waypoints: any[]
}): Promise<DeliveryRoute | null> {
  try {
    // Remove existing route for this vehicle
    routes = routes.filter(r => r.vehicle_id !== routeData.vehicle_id)

    const newRoute: DeliveryRoute = {
      id: `local-route-${Date.now()}`,
      vehicle_id: routeData.vehicle_id,
      route_geometry: routeData.route_geometry,
      total_distance: routeData.total_distance,
      total_duration: routeData.total_duration,
      waypoints: routeData.waypoints,
      is_optimized: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    routes.push(newRoute)
    console.log('✅ [LOCAL] Route saved for vehicle:', routeData.vehicle_id)
    
    return newRoute
  } catch (error) {
    console.error('❌ [LOCAL] Failed to save route:', error)
    return null
  }
}

export async function getDeliveryRoute(vehicleId: string): Promise<DeliveryRoute | null> {
  return routes.find(r => r.vehicle_id === vehicleId) || null
}

export async function getAllDeliveryRoutes(): Promise<DeliveryRoute[]> {
  return [...routes]
}

// ==================== GEOCODING HELPER ====================

export async function geocodeAddress(address: string, mapboxToken: string): Promise<{lat: number, lng: number} | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1&types=place,locality,neighborhood,address`
    )
    
    if (!response.ok) {
      throw new Error('Geocoding failed')
    }

    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      console.log('🗺️ [LOCAL] Geocoded address:', address, '→', { lat, lng })
      return { lat, lng }
    }
    
    return null
  } catch (error) {
    console.error('❌ [LOCAL] Geocoding error:', error)
    return null
  }
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================

export function subscribeToVehicles(callback: (vehicles: Vehicle[]) => void) {
  vehicleCallbacks.push(callback)
  console.log('🔔 [LOCAL] Subscribed to vehicles')
  
  // Return mock subscription object
  return {
    unsubscribe: () => {
      const index = vehicleCallbacks.indexOf(callback)
      if (index > -1) {
        vehicleCallbacks.splice(index, 1)
        console.log('🔕 [LOCAL] Unsubscribed from vehicles')
      }
    }
  }
}

export function subscribeToPackages(callback: (packages: Package[]) => void) {
  packageCallbacks.push(callback)
  console.log('🔔 [LOCAL] Subscribed to packages')
  
  // Return mock subscription object
  return {
    unsubscribe: () => {
      const index = packageCallbacks.indexOf(callback)
      if (index > -1) {
        packageCallbacks.splice(index, 1)
        console.log('🔕 [LOCAL] Unsubscribed from packages')
      }
    }
  }
}

// ==================== SIMULATION API ====================

export async function startSimulation(): Promise<{ success: boolean; message: string }> {
  try {
    // Get vehicles that have packages
    const vehicleIds = [...new Set(packages.filter(p => p.status === 'pending').map(p => p.vehicle_id))]

    // Update vehicles to active
    for (const vehicleId of vehicleIds) {
      await updateVehicle(vehicleId, { status: 'active' })
    }

    // Update packages to in-transit
    for (const pkg of packages) {
      if (pkg.status === 'pending') {
        await updatePackageStatus(pkg.package_id, 'in-transit')
      }
    }

    console.log('✅ [LOCAL] Simulation started')
    return { success: true, message: 'Simulation started successfully' }
  } catch (error) {
    console.error('❌ [LOCAL] Failed to start simulation:', error)
    return { success: false, message: 'Failed to start simulation' }
  }
}

export async function stopSimulation(): Promise<{ success: boolean; message: string }> {
  try {
    // Reset all vehicles to idle
    for (const vehicle of vehicles) {
      if (vehicle.status !== 'idle') {
        await updateVehicle(vehicle.vehicle_id, { status: 'idle', progress: 0 })
      }
    }

    // Reset packages to pending
    for (const pkg of packages) {
      if (pkg.status === 'in-transit') {
        await updatePackageStatus(pkg.package_id, 'pending')
      }
    }

    console.log('✅ [LOCAL] Simulation stopped')
    return { success: true, message: 'Simulation stopped successfully' }
  } catch (error) {
    console.error('❌ [LOCAL] Failed to stop simulation:', error)
    return { success: false, message: 'Failed to stop simulation' }
  }
}

// ==================== LOCAL TESTING UTILITIES ====================

export function getLocalDatabaseState() {
  return {
    vehicles: vehicles.length,
    packages: packages.length,
    routes: routes.length,
    subscribers: {
      vehicles: vehicleCallbacks.length,
      packages: packageCallbacks.length
    }
  }
}

export function resetLocalDatabase() {
  vehicles = []
  packages = []
  routes = []
  console.log('🔄 [LOCAL] Database reset')
  notifyVehicleSubscribers()
  notifyPackageSubscribers()
}