// Delete vehicle and its packages from Supabase
import { supabase } from './supabase';

export async function deleteVehicleCascade(vehicle_id: string) {
  // Delete all packages assigned to this vehicle
  const { error: pkgError } = await supabase
    .from('packages')
    .delete()
    .eq('vehicle_id', vehicle_id);

  if (pkgError) throw pkgError;

  // Delete all routes for this vehicle
  const { error: routeError } = await supabase
    .from('routes')
    .delete()
    .eq('vehicle_id', vehicle_id);

  if (routeError) throw routeError;

  // Delete the vehicle itself
  const { error: vehError } = await supabase
    .from('vehicles')
    .delete()
    .eq('vehicle_id', vehicle_id);

  if (vehError) throw vehError;

  return { success: true };
}
