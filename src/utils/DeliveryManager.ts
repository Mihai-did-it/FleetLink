// DeliveryManager.ts - Clean, modular delivery system
import { type VehicleWithPackages } from '../types'
import { type Package } from '../lib/local-api'

export interface DeliveryResult {
  deliveredPackages: string[]
  remainingPackages: string[]
  deliveryLocations: Array<{
    packageId: string
    destination: string
    coordinates: [number, number]
  }>
}

export class DeliveryManager {
  private static readonly DELIVERY_RADIUS_KM = 0.08 // 80 meters - reasonable delivery range
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * Filter packages that have valid coordinates
   */
  private static validatePackages(packages: Package[]): Package[] {
    return packages.filter(pkg => 
      pkg.destination_lat && 
      pkg.destination_lng && 
      !isNaN(pkg.destination_lat) && 
      !isNaN(pkg.destination_lng)
    )
  }

  /**
   * Check which packages can be delivered at current vehicle position
   */
  static checkDeliveries(
    vehicle: VehicleWithPackages, 
    currentPosition: [number, number], 
    alreadyDelivered: string[] = []
  ): DeliveryResult {
    const validPackages = this.validatePackages(vehicle.packages)
    const deliveredPackages: string[] = []
    const deliveryLocations: Array<{packageId: string, destination: string, coordinates: [number, number]}> = []
    
    for (const pkg of validPackages) {
      // Skip if already delivered
      if (alreadyDelivered.includes(pkg.package_id)) continue
      
      // Calculate distance to package destination
      const distance = this.calculateDistance(
        currentPosition[1], // vehicle lat
        currentPosition[0], // vehicle lng
        pkg.destination_lat!,
        pkg.destination_lng!
      )
      
      // Check if within delivery range
      if (distance <= this.DELIVERY_RADIUS_KM) {
        deliveredPackages.push(pkg.package_id)
        deliveryLocations.push({
          packageId: pkg.package_id,
          destination: pkg.destination,
          coordinates: [pkg.destination_lng!, pkg.destination_lat!]
        })
      }
    }
    
    const remainingPackages = validPackages
      .filter(pkg => !alreadyDelivered.includes(pkg.package_id) && !deliveredPackages.includes(pkg.package_id))
      .map(pkg => pkg.package_id)
    
    return {
      deliveredPackages,
      remainingPackages,
      deliveryLocations
    }
  }

  /**
   * Get delivery status summary for a vehicle
   */
  static getDeliveryStatus(vehicle: VehicleWithPackages, deliveredPackages: string[]) {
    const validPackages = this.validatePackages(vehicle.packages)
    const totalPackages = vehicle.packages.length
    const validCount = validPackages.length
    const deliveredCount = deliveredPackages.length
    const remainingCount = validCount - deliveredCount
    
    return {
      totalPackages,
      validPackages: validCount,
      deliveredPackages: deliveredCount,
      remainingPackages: remainingCount,
      allDelivered: remainingCount === 0 && validCount > 0,
      hasInvalidPackages: totalPackages > validCount
    }
  }
}