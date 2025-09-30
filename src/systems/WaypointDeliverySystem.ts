// WaypointDeliverySystem.ts - Precise delivery system based on route waypoints
import { VehicleWithPackages } from '@/types'
import { Package } from '@/lib/local-api'

export interface DeliveryWaypoint {
  packageId: string
  coordinates: [number, number] // [lng, lat]
  destination: string
  routeProgress: number // Exact position along route (0-1)
  isDelivered: boolean
  distanceFromRoute: number // How far package is from the route
}

export interface WaypointDeliveryResult {
  deliveredPackages: string[]
  newDeliveries: string[]
  nextWaypoint?: DeliveryWaypoint
  allWaypoints: DeliveryWaypoint[]
  currentWaypoint?: DeliveryWaypoint
}

/**
 * Waypoint-based delivery system that ensures packages are delivered 
 * only when the vehicle reaches the exact delivery locations along the route
 */
export class WaypointDeliverySystem {
  private static readonly WAYPOINT_TOLERANCE = 0.01 // 1% route progress tolerance
  private static readonly MAX_DISTANCE_FROM_ROUTE_KM = 0.5 // 500m max distance from route
  
  /**
   * Map package destinations to precise waypoints along the route
   */
  static createDeliveryWaypoints(
    vehicle: VehicleWithPackages,
    routeCoordinates: [number, number][]
  ): DeliveryWaypoint[] {
    if (!vehicle.packages || !routeCoordinates.length) return []
    
    const waypoints: DeliveryWaypoint[] = []
    
    console.log(`🎯 Creating waypoints for ${vehicle.packages.length} packages`)
    
    for (const pkg of vehicle.packages) {
      if (!pkg.destination_lat || !pkg.destination_lng) {
        console.warn(`⚠️ Package ${pkg.package_id} missing coordinates - skipping`)
        continue
      }
      
      const packageCoords: [number, number] = [pkg.destination_lng, pkg.destination_lat]
      const closestPoint = this.findClosestPointOnRoute(packageCoords, routeCoordinates)
      
      if (closestPoint && closestPoint.distance <= this.MAX_DISTANCE_FROM_ROUTE_KM) {
        const waypoint: DeliveryWaypoint = {
          packageId: pkg.package_id,
          coordinates: packageCoords,
          destination: pkg.destination,
          routeProgress: closestPoint.progress,
          isDelivered: false,
          distanceFromRoute: closestPoint.distance * 1000 // Convert to meters
        }
        
        waypoints.push(waypoint)
        
        console.log(`📍 Waypoint created: ${pkg.package_id} at ${(closestPoint.progress * 100).toFixed(1)}% route progress`)
      } else {
        console.warn(`⚠️ Package ${pkg.package_id} too far from route (${closestPoint?.distance.toFixed(3)}km) - skipping`)
      }
    }
    
    // Sort waypoints by route progress for proper delivery order
    waypoints.sort((a, b) => a.routeProgress - b.routeProgress)
    
    console.log(`✅ Created ${waypoints.length} delivery waypoints:`, 
      waypoints.map(w => ({
        package: w.packageId,
        progress: (w.routeProgress * 100).toFixed(1) + '%',
        destination: w.destination
      }))
    )
    
    return waypoints
  }
  
  /**
   * Check for deliveries based on exact waypoint arrival
   */
  static checkWaypointDeliveries(
    currentRouteProgress: number,
    deliveryWaypoints: DeliveryWaypoint[],
    alreadyDelivered: string[] = []
  ): WaypointDeliveryResult {
    
    const newDeliveries: string[] = []
    const allDeliveredPackages = [...alreadyDelivered]
    let currentWaypoint: DeliveryWaypoint | undefined
    
    console.log(`🚚 Checking waypoint deliveries at ${(currentRouteProgress * 100).toFixed(2)}% progress`)
    
    // Check each waypoint for delivery eligibility
    for (const waypoint of deliveryWaypoints) {
      // Skip if already delivered
      if (alreadyDelivered.includes(waypoint.packageId)) {
        waypoint.isDelivered = true
        continue
      }
      
      // Check if vehicle has reached this waypoint
      const hasReachedWaypoint = currentRouteProgress >= (waypoint.routeProgress - this.WAYPOINT_TOLERANCE)
      const hasPassedWaypoint = currentRouteProgress > (waypoint.routeProgress + this.WAYPOINT_TOLERANCE)
      
      console.log(`📦 Waypoint ${waypoint.packageId}:`, {
        destination: waypoint.destination,
        waypointProgress: (waypoint.routeProgress * 100).toFixed(2) + '%',
        currentProgress: (currentRouteProgress * 100).toFixed(2) + '%',
        hasReached: hasReachedWaypoint,
        hasPassed: hasPassedWaypoint,
        tolerance: (this.WAYPOINT_TOLERANCE * 100).toFixed(1) + '%'
      })
      
      // Deliver if vehicle has reached waypoint but not passed it significantly
      if (hasReachedWaypoint && !hasPassedWaypoint) {
        currentWaypoint = waypoint
        
        // Only deliver once when first reaching the waypoint
        if (!waypoint.isDelivered) {
          newDeliveries.push(waypoint.packageId)
          allDeliveredPackages.push(waypoint.packageId)
          waypoint.isDelivered = true
          
          console.log(`🎉 WAYPOINT DELIVERY: ${waypoint.packageId} at ${waypoint.destination}`)
        }
      }
    }
    
    // Find next undelivered waypoint
    const nextWaypoint = deliveryWaypoints.find(w => 
      !w.isDelivered && 
      currentRouteProgress < (w.routeProgress - this.WAYPOINT_TOLERANCE)
    )
    
    if (nextWaypoint) {
      const distanceToNext = (nextWaypoint.routeProgress - currentRouteProgress) * 100
      console.log(`➡️ Next waypoint: ${nextWaypoint.packageId} in ${distanceToNext.toFixed(1)}% progress`)
    }
    
    return {
      deliveredPackages: allDeliveredPackages,
      newDeliveries,
      nextWaypoint,
      currentWaypoint,
      allWaypoints: deliveryWaypoints
    }
  }
  
  /**
   * Find the closest point on the route to a given coordinate
   */
  private static findClosestPointOnRoute(
    targetCoords: [number, number],
    routeCoordinates: [number, number][]
  ): { coordinates: [number, number]; progress: number; distance: number } | null {
    
    if (!routeCoordinates.length) return null
    
    let closestPoint: { coordinates: [number, number]; progress: number; distance: number } | null = null
    let minDistance = Infinity
    
    // Calculate total route distance for progress calculation
    const totalDistance = this.calculateRouteDistance(routeCoordinates)
    let cumulativeDistance = 0
    
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i]
      const segmentEnd = routeCoordinates[i + 1]
      
      // Find closest point on this segment
      const closestOnSegment = this.findClosestPointOnSegment(
        targetCoords, 
        segmentStart, 
        segmentEnd
      )
      
      if (closestOnSegment.distance < minDistance) {
        minDistance = closestOnSegment.distance
        
        // Calculate progress along route
        const segmentDistance = this.calculateDistance(
          segmentStart[1], segmentStart[0],
          segmentEnd[1], segmentEnd[0]
        )
        const distanceToPoint = this.calculateDistance(
          segmentStart[1], segmentStart[0],
          closestOnSegment.coordinates[1], closestOnSegment.coordinates[0]
        )
        
        const progress = (cumulativeDistance + distanceToPoint) / totalDistance
        
        closestPoint = {
          coordinates: closestOnSegment.coordinates,
          progress: Math.min(Math.max(progress, 0), 1), // Clamp between 0-1
          distance: closestOnSegment.distance
        }
      }
      
      // Add segment distance for next iteration
      cumulativeDistance += this.calculateDistance(
        segmentStart[1], segmentStart[0],
        segmentEnd[1], segmentEnd[0]
      )
    }
    
    return closestPoint
  }
  
  /**
   * Find closest point on a line segment to a target point
   */
  private static findClosestPointOnSegment(
    target: [number, number],
    segmentStart: [number, number],
    segmentEnd: [number, number]
  ): { coordinates: [number, number]; distance: number } {
    
    const [targetX, targetY] = target
    const [x1, y1] = segmentStart
    const [x2, y2] = segmentEnd
    
    const dx = x2 - x1
    const dy = y2 - y1
    
    if (dx === 0 && dy === 0) {
      // Segment is a point
      const distance = this.calculateDistance(targetY, targetX, y1, x1)
      return { coordinates: [x1, y1], distance }
    }
    
    // Calculate the parameter t for the closest point on the line
    const t = Math.max(0, Math.min(1, 
      ((targetX - x1) * dx + (targetY - y1) * dy) / (dx * dx + dy * dy)
    ))
    
    // Calculate the closest point
    const closestX = x1 + t * dx
    const closestY = y1 + t * dy
    
    const distance = this.calculateDistance(targetY, targetX, closestY, closestX)
    
    return { coordinates: [closestX, closestY], distance }
  }
  
  /**
   * Calculate total route distance
   */
  private static calculateRouteDistance(coordinates: [number, number][]): number {
    let totalDistance = 0
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lng1, lat1] = coordinates[i]
      const [lng2, lat2] = coordinates[i + 1]
      totalDistance += this.calculateDistance(lat1, lng1, lat2, lng2)
    }
    return totalDistance
  }
  
  /**
   * Calculate distance between two coordinates using Haversine formula (returns km)
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
   * Get final position for vehicle (last delivery location)
   */
  static getFinalVehiclePosition(
    deliveryWaypoints: DeliveryWaypoint[], 
    deliveredPackages: string[]
  ): [number, number] | null {
    
    // Find the last delivered package
    const deliveredWaypoints = deliveryWaypoints.filter(w => 
      deliveredPackages.includes(w.packageId)
    )
    
    if (deliveredWaypoints.length === 0) return null
    
    // Sort by route progress and get the last one
    const lastDelivery = deliveredWaypoints.sort((a, b) => 
      b.routeProgress - a.routeProgress
    )[0]
    
    console.log(`🏁 Final vehicle position: ${lastDelivery.destination} at ${lastDelivery.coordinates}`)
    
    return lastDelivery.coordinates
  }
}