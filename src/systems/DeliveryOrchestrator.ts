// DeliveryOrchestrator.ts - Coordinates all delivery systems
import { VehicleWithPackages } from '@/types'
import { WaypointDeliverySystem, DeliveryWaypoint } from './WaypointDeliverySystem'
import { DeliveryMarkerManager } from './DeliveryMarkerManager'
import { VehicleStateManager, VehicleState } from './VehicleStateManager'
import { NotificationManager } from '../utils/NotificationManager'
import mapboxgl from 'mapbox-gl'

export interface DeliverySession {
  vehicleId: string
  waypoints: DeliveryWaypoint[]
  markerManager: DeliveryMarkerManager
  isActive: boolean
}

/**
 * Orchestrates the entire delivery process from route creation to completion
 */
export class DeliveryOrchestrator {
  private vehicleStateManager: VehicleStateManager
  private deliverySessions: Map<string, DeliverySession> = new Map()
  private map: mapboxgl.Map
  
  constructor(map: mapboxgl.Map) {
    this.map = map
    this.vehicleStateManager = new VehicleStateManager()
  }
  
  /**
   * Initialize delivery session for a vehicle
   */
  initializeDeliverySession(
    vehicle: VehicleWithPackages,
    routeCoordinates: [number, number][],
    startPosition: [number, number]
  ): DeliverySession | null {
    
    console.log(`🎬 Initializing delivery session for vehicle ${vehicle.vehicle_id}`)
    
    // Create delivery waypoints
    const waypoints = WaypointDeliverySystem.createDeliveryWaypoints(vehicle, routeCoordinates)
    
    if (waypoints.length === 0) {
      console.warn(`⚠️ No valid delivery waypoints created for vehicle ${vehicle.vehicle_id}`)
      return null
    }
    
    // Initialize vehicle state
    this.vehicleStateManager.initializeVehicle(vehicle, waypoints, startPosition)
    
    // Create marker manager for this vehicle
    const markerManager = new DeliveryMarkerManager(this.map)
    
    // Add delivery target markers
    markerManager.addDeliveryTargets(waypoints)
    
    // Highlight first target
    if (waypoints[0]) {
      markerManager.highlightNextTarget(waypoints[0].packageId)
    }
    
    const session: DeliverySession = {
      vehicleId: vehicle.vehicle_id,
      waypoints,
      markerManager,
      isActive: false
    }
    
    this.deliverySessions.set(vehicle.vehicle_id, session)
    
    console.log(`✅ Delivery session initialized for ${vehicle.vehicle_id} with ${waypoints.length} waypoints`)
    
    return session
  }
  
  /**
   * Start delivery simulation
   */
  startDeliverySimulation(vehicleId: string): boolean {
    const session = this.deliverySessions.get(vehicleId)
    if (!session) return false
    
    session.isActive = true
    this.vehicleStateManager.startVehicle(vehicleId)
    
    console.log(`🚀 Started delivery simulation for vehicle ${vehicleId}`)
    return true
  }
  
  /**
   * Process delivery during vehicle movement
   */
  processDeliveryUpdate(
    vehicleId: string,
    currentPosition: [number, number],
    routeProgress: number,
    currentSpeed: number
  ): {
    newDeliveries: string[]
    isComplete: boolean
    finalPosition?: [number, number]
  } {
    
    const session = this.deliverySessions.get(vehicleId)
    if (!session || !session.isActive) {
      return { newDeliveries: [], isComplete: false }
    }
    
    const vehicleState = this.vehicleStateManager.getVehicleState(vehicleId)
    if (!vehicleState) {
      return { newDeliveries: [], isComplete: false }
    }
    
    // Check for waypoint deliveries
    const deliveryResult = WaypointDeliverySystem.checkWaypointDeliveries(
      routeProgress,
      session.waypoints,
      vehicleState.deliveredPackages
    )
    
    // Process new deliveries
    if (deliveryResult.newDeliveries.length > 0) {
      console.log(`📦 Processing ${deliveryResult.newDeliveries.length} new deliveries for ${vehicleId}`)
      
      // Update markers
      deliveryResult.newDeliveries.forEach(packageId => {
        session.markerManager.markAsDelivered(packageId)
        
        // Show notification
        const waypoint = session.waypoints.find(w => w.packageId === packageId)
        if (waypoint) {
          NotificationManager.showDeliverySuccess({
            vehicleId,
            packageId,
            destination: waypoint.destination,
            distanceMeters: 0
          })
        }
      })
      
      // Highlight next target
      if (deliveryResult.nextWaypoint) {
        session.markerManager.highlightNextTarget(deliveryResult.nextWaypoint.packageId)
      }
    }
    
    // Check if route is complete
    const isComplete = routeProgress >= 1.0
    let finalPosition: [number, number] | undefined
    
    if (isComplete) {
      // Get final position from last delivery
      finalPosition = WaypointDeliverySystem.getFinalVehiclePosition(
        session.waypoints,
        deliveryResult.deliveredPackages
      ) || currentPosition
      
      this.completeDeliverySession(vehicleId, deliveryResult.deliveredPackages, finalPosition)
    }
    
    // Update vehicle state
    this.vehicleStateManager.updateVehicle(vehicleId, {
      position: currentPosition,
      progress: routeProgress,
      speed: currentSpeed,
      deliveredPackages: deliveryResult.deliveredPackages,
      isComplete,
      finalPosition
    })
    
    return {
      newDeliveries: deliveryResult.newDeliveries,
      isComplete,
      finalPosition
    }
  }
  
  /**
   * Complete delivery session
   */
  private completeDeliverySession(
    vehicleId: string,
    deliveredPackages: string[],
    finalPosition: [number, number]
  ): void {
    
    const session = this.deliverySessions.get(vehicleId)
    if (!session) return
    
    session.isActive = false
    
    // Show completion notification
    NotificationManager.showRouteComplete(vehicleId, deliveredPackages.length)
    
    // Get delivery summary
    const deliveryStatus = session.markerManager.getDeliveryStatus()
    
    console.log(`🏁 Delivery session complete for ${vehicleId}:`, {
      totalWaypoints: session.waypoints.length,
      delivered: deliveredPackages.length,
      markerStatus: deliveryStatus,
      finalPosition
    })
  }
  
  /**
   * Stop delivery simulation
   */
  stopDeliverySimulation(vehicleId: string): boolean {
    const session = this.deliverySessions.get(vehicleId)
    if (!session) return false
    
    session.isActive = false
    this.vehicleStateManager.stopVehicle(vehicleId)
    
    console.log(`⏹️ Stopped delivery simulation for vehicle ${vehicleId}`)
    return true
  }
  
  /**
   * Get vehicle delivery state
   */
  getVehicleDeliveryState(vehicleId: string): VehicleState | null {
    return this.vehicleStateManager.getVehicleState(vehicleId)
  }
  
  /**
   * Get delivery progress for vehicle
   */
  getDeliveryProgress(vehicleId: string): {
    total: number
    delivered: number
    remaining: number
    percentage: number
  } {
    return this.vehicleStateManager.getDeliveryProgress(vehicleId)
  }
  
  /**
   * Clear delivery session
   */
  clearDeliverySession(vehicleId: string): void {
    const session = this.deliverySessions.get(vehicleId)
    if (session) {
      session.markerManager.clearAllMarkers()
      this.deliverySessions.delete(vehicleId)
    }
    
    this.vehicleStateManager.removeVehicle(vehicleId)
    
    console.log(`🧹 Cleared delivery session for vehicle ${vehicleId}`)
  }
  
  /**
   * Clear all delivery sessions
   */
  clearAllDeliverySessions(): void {
    console.log(`🧹 Clearing all delivery sessions`)
    
    this.deliverySessions.forEach((session) => {
      session.markerManager.clearAllMarkers()
    })
    
    this.deliverySessions.clear()
    this.vehicleStateManager.clearAllVehicles()
  }
  
  /**
   * Get fleet delivery summary
   */
  getFleetDeliverySummary(): {
    totalVehicles: number
    activeVehicles: number
    completedVehicles: number
    totalDeliveries: number
    completedDeliveries: number
  } {
    return this.vehicleStateManager.getFleetSummary()
  }
  
  /**
   * Get active delivery sessions
   */
  getActiveDeliverySessions(): DeliverySession[] {
    return Array.from(this.deliverySessions.values()).filter(session => session.isActive)
  }
  
  /**
   * Check if vehicle has active delivery session
   */
  hasActiveDeliverySession(vehicleId: string): boolean {
    const session = this.deliverySessions.get(vehicleId)
    return session ? session.isActive : false
  }
}