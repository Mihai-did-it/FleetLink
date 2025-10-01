// Local mock database for testing without Supabase
import { type Vehicle, type Package, type DeliveryRoute, supabase, TABLES } from './supabase'

// UUID generator for Supabase inserts
function generateUUID() {
  // RFC4122 version 4 compliant UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Re-export types for convenience
export type { Vehicle, Package, DeliveryRoute } from './supabase'


// ==================== VEHICLES API ====================

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from(TABLES.VEHICLES).select('*');
  if (error) throw error;
  return data || [];
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
  const id = generateUUID();
  const { data, error } = await supabase.from(TABLES.VEHICLES).insert([
    {
      id,
      vehicle_id: vehicleData.vehicle_id,
      driver: vehicleData.driver,
      lat: vehicleData.lat,
      lng: vehicleData.lng,
      location: vehicleData.location,
      status: vehicleData.status || 'idle',
      speed: vehicleData.speed || 0,
      progress: 0
    }
  ]).select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
  const { data, error } = await supabase.from(TABLES.VEHICLES)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('vehicle_id', vehicleId)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  const { error } = await supabase.from(TABLES.VEHICLES)
    .delete()
    .eq('vehicle_id', vehicleId);
  if (error) throw error;
  // Also remove packages for this vehicle
  await supabase.from(TABLES.PACKAGES).delete().eq('vehicle_id', vehicleId);
  return true;
}

// ==================== PACKAGES API ====================

export async function getPackages(): Promise<Package[]> {
  const { data, error } = await supabase.from(TABLES.PACKAGES).select('*');
  if (error) throw error;
  return data || [];
}

export async function getPackagesByVehicle(vehicleId: string): Promise<Package[]> {
  const { data, error } = await supabase.from(TABLES.PACKAGES).select('*').eq('vehicle_id', vehicleId);
  if (error) throw error;
  return data || [];
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
  const id = generateUUID();
  const { data, error } = await supabase.from(TABLES.PACKAGES).insert([
    {
      id,
      package_id: packageData.package_id,
      vehicle_id: packageData.vehicle_id,
      destination: packageData.destination,
      destination_lat: packageData.destination_lat,
      destination_lng: packageData.destination_lng,
      weight: packageData.weight,
      status: 'pending',
      priority: packageData.priority || 'medium',
      recipient_name: packageData.recipient_name,
      package_type: packageData.package_type
    }
  ]).select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function updatePackageStatus(packageId: string, status: Package['status']): Promise<Package | null> {
  const { data, error } = await supabase.from(TABLES.PACKAGES)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('package_id', packageId)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function deletePackage(packageId: string): Promise<boolean> {
  const { error } = await supabase.from(TABLES.PACKAGES)
    .delete()
    .eq('package_id', packageId);
  if (error) throw error;
  return true;
}

// ==================== ROUTES API ====================

// ...existing code...
// ...existing code...
// ==================== ROUTES API ====================

export async function saveDeliveryRoute(routeData: {
  vehicle_id: string
  route_geometry: any
  total_distance: number
  total_duration: number
  waypoints: any[]
}): Promise<DeliveryRoute | null> {
  const id = generateUUID();
  // Remove existing route for this vehicle
  await supabase.from(TABLES.ROUTES).delete().eq('vehicle_id', routeData.vehicle_id);
  const { data, error } = await supabase.from(TABLES.ROUTES).insert([
    {
      id,
      vehicle_id: routeData.vehicle_id,
      route_geometry: routeData.route_geometry,
      total_distance: routeData.total_distance,
      total_duration: routeData.total_duration,
      waypoints: routeData.waypoints,
      is_optimized: true
    }
  ]).select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function getDeliveryRoute(vehicleId: string): Promise<DeliveryRoute | null> {
  const { data, error } = await supabase.from(TABLES.ROUTES).select('*').eq('vehicle_id', vehicleId);
  if (error) throw error;
  return data?.[0] || null;
}

export async function getAllDeliveryRoutes(): Promise<DeliveryRoute[]> {
  const { data, error } = await supabase.from(TABLES.ROUTES).select('*');
  if (error) throw error;
  return data || [];
}

// ==================== SIMULATION API ====================

export async function startSimulation(): Promise<{ success: boolean; message: string }> {
  try {
    // Get vehicles that have pending packages
    const { data: packages, error: pkgError } = await supabase.from(TABLES.PACKAGES).select('*').eq('status', 'pending');
    if (pkgError) throw pkgError;
    const vehicleIds = [...new Set((packages || []).map(p => p.vehicle_id))];

    // Update vehicles to active
    for (const vehicleId of vehicleIds) {
      await updateVehicle(vehicleId, { status: 'active' });
    }

    // Update packages to in-transit
    for (const pkg of packages || []) {
      await updatePackageStatus(pkg.package_id, 'in-transit');
    }

    return { success: true, message: 'Simulation started successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to start simulation' };
  }
}

export async function stopSimulation(): Promise<{ success: boolean; message: string }> {
  try {
    // Reset all vehicles to idle
    const { data: vehicles, error: vehError } = await supabase.from(TABLES.VEHICLES).select('*').neq('status', 'idle');
    if (vehError) throw vehError;
    for (const vehicle of vehicles || []) {
      await updateVehicle(vehicle.vehicle_id, { status: 'idle', progress: 0 });
    }

    // Reset packages to pending
    const { data: packages, error: pkgError } = await supabase.from(TABLES.PACKAGES).select('*').eq('status', 'in-transit');
    if (pkgError) throw pkgError;
    for (const pkg of packages || []) {
      await updatePackageStatus(pkg.package_id, 'pending');
    }

    return { success: true, message: 'Simulation stopped successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to stop simulation' };
  }
}

// ==================== LOCAL TESTING UTILITIES ====================

// Removed local database state and reset functions (no longer needed)