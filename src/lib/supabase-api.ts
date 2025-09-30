import { supabase, type Vehicle, type Package, type DeliveryRoute, TABLES } from './supabase'

// Re-export types for use in other files
export type { Vehicle, Package, DeliveryRoute }

// ==================== VEHICLES API ====================

export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.VEHICLES)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching vehicles:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch vehicles:', error)
    return []
  }
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
    const newVehicle = {
      vehicle_id: vehicleData.vehicle_id,
      driver: vehicleData.driver,
      lat: vehicleData.lat,
      lng: vehicleData.lng,
      location: vehicleData.location,
      status: vehicleData.status || 'idle',
      speed: vehicleData.speed || 0,
      progress: 0
    }

    const { data, error } = await supabase
      .from(TABLES.VEHICLES)
      .insert([newVehicle])
      .select()
      .single()

    if (error) {
      console.error('Error adding vehicle:', error)
      throw error
    }

    console.log('Vehicle added successfully:', data)
    return data
  } catch (error) {
    console.error('Failed to add vehicle:', error)
    return null
  }
}

export async function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.VEHICLES)
      .update(updates)
      .eq('vehicle_id', vehicleId)
      .select()
      .single()

    if (error) {
      console.error('Error updating vehicle:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to update vehicle:', error)
    return null
  }
}

export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLES.VEHICLES)
      .delete()
      .eq('vehicle_id', vehicleId)

    if (error) {
      console.error('Error deleting vehicle:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to delete vehicle:', error)
    return false
  }
}

// ==================== PACKAGES API ====================

export async function getPackages(): Promise<Package[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.PACKAGES)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching packages:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch packages:', error)
    return []
  }
}

export async function getPackagesByVehicle(vehicleId: string): Promise<Package[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.PACKAGES)
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching packages for vehicle:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch packages for vehicle:', error)
    return []
  }
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
    const newPackage = {
      package_id: packageData.package_id,
      vehicle_id: packageData.vehicle_id,
      destination: packageData.destination,
      destination_lat: packageData.destination_lat,
      destination_lng: packageData.destination_lng,
      weight: packageData.weight,
      status: 'pending' as const,
      priority: packageData.priority || 'medium',
      recipient_name: packageData.recipient_name,
      package_type: packageData.package_type
    }

    const { data, error } = await supabase
      .from(TABLES.PACKAGES)
      .insert([newPackage])
      .select()
      .single()

    if (error) {
      console.error('Error adding package:', error)
      throw error
    }

    console.log('Package added successfully:', data)
    return data
  } catch (error) {
    console.error('Failed to add package:', error)
    return null
  }
}

export async function updatePackageStatus(packageId: string, status: Package['status']): Promise<Package | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.PACKAGES)
      .update({ status })
      .eq('package_id', packageId)
      .select()
      .single()

    if (error) {
      console.error('Error updating package status:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to update package status:', error)
    return null
  }
}

export async function deletePackage(packageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLES.PACKAGES)
      .delete()
      .eq('package_id', packageId)

    if (error) {
      console.error('Error deleting package:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to delete package:', error)
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
    const newRoute = {
      ...routeData,
      is_optimized: true
    }

    // First, delete any existing route for this vehicle
    await supabase
      .from(TABLES.ROUTES)
      .delete()
      .eq('vehicle_id', routeData.vehicle_id)

    // Then insert the new route
    const { data, error } = await supabase
      .from(TABLES.ROUTES)
      .insert([newRoute])
      .select()
      .single()

    if (error) {
      console.error('Error saving route:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to save route:', error)
    return null
  }
}

export async function getDeliveryRoute(vehicleId: string): Promise<DeliveryRoute | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.ROUTES)
      .select('*')
      .eq('vehicle_id', vehicleId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No route found, return null
        return null
      }
      console.error('Error fetching route:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to fetch route:', error)
    return null
  }
}

export async function getAllDeliveryRoutes(): Promise<DeliveryRoute[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.ROUTES)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching routes:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch routes:', error)
    return []
  }
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
      return { lat, lng }
    }
    
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================

export function subscribeToVehicles(callback: (vehicles: Vehicle[]) => void) {
  const subscription = supabase
    .channel('vehicles-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: TABLES.VEHICLES },
      () => {
        // Refetch all vehicles when any change occurs
        getVehicles().then(callback)
      }
    )
    .subscribe()

  return subscription
}

export function subscribeToPackages(callback: (packages: Package[]) => void) {
  const subscription = supabase
    .channel('packages-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: TABLES.PACKAGES },
      () => {
        // Refetch all packages when any change occurs
        getPackages().then(callback)
      }
    )
    .subscribe()

  return subscription
}

// ==================== SIMULATION API ====================

export async function startSimulation(): Promise<{ success: boolean; message: string }> {
  try {
    // First get vehicles that have packages
    const { data: packagesData } = await supabase
      .from(TABLES.PACKAGES)
      .select('vehicle_id')
      .eq('status', 'pending')

    const vehicleIds = [...new Set(packagesData?.map(p => p.vehicle_id) || [])]

    if (vehicleIds.length > 0) {
      // Update vehicles with packages to 'active' status
      const { error } = await supabase
        .from(TABLES.VEHICLES)
        .update({ status: 'active' })
        .in('vehicle_id', vehicleIds)

      if (error) {
        console.error('Error starting simulation:', error)
        throw error
      }
    }

    // Update packages to 'in-transit'
    await supabase
      .from(TABLES.PACKAGES)
      .update({ status: 'in-transit' })
      .eq('status', 'pending')

    return { success: true, message: 'Simulation started successfully' }
  } catch (error) {
    console.error('Failed to start simulation:', error)
    return { success: false, message: 'Failed to start simulation' }
  }
}

export async function stopSimulation(): Promise<{ success: boolean; message: string }> {
  try {
    // Reset all vehicles to idle
    const { error } = await supabase
      .from(TABLES.VEHICLES)
      .update({ status: 'idle', progress: 0 })
      .neq('status', 'idle')

    if (error) {
      console.error('Error stopping simulation:', error)
      throw error
    }

    // Reset packages to pending
    await supabase
      .from(TABLES.PACKAGES)
      .update({ status: 'pending' })
      .eq('status', 'in-transit')

    return { success: true, message: 'Simulation stopped successfully' }
  } catch (error) {
    console.error('Failed to stop simulation:', error)
    return { success: false, message: 'Failed to stop simulation' }
  }
}