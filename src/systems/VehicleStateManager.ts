// VehicleStateManager.ts - Manages vehicle state and position updates
import { VehicleWithPackages } from '@/types'
import { DeliveryWaypoint } from './WaypointDeliverySystem'

export interface VehicleState {
  vehicleId: string
  currentPosition: [number, number] // [lng, lat]
  routeProgress: number
  isActive: boolean
  currentSpeed: number
  deliveredPackages: string[]
  deliveryWaypoints: DeliveryWaypoint[]
  lastUpdateTime: number
  finalPosition?: [number, number] // Position after all deliveries
}

export interface VehicleUpdate {
  position: [number, number]
  progress: number
  speed: number
  deliveredPackages: string[]
  isComplete: boolean
  finalPosition?: [number, number]
}

/**
 * Manages vehicle state throughout the delivery process
 */
export class VehicleStateManager {
  private vehicleStates: Map<string, VehicleState> = new Map()
  
  /**
   * Initialize vehicle state with delivery waypoints
   */
  initializeVehicle(
    vehicle: VehicleWithPackages,
    deliveryWaypoints: DeliveryWaypoint[],
    startPosition: [number, number]
  ): VehicleState {
    
    const vehicleState: VehicleState = {
      vehicleId: vehicle.vehicle_id,
      currentPosition: startPosition,
      routeProgress: 0,
      isActive: false,
      currentSpeed: 0,
      deliveredPackages: [],
      deliveryWaypoints,
      lastUpdateTime: Date.now()
    }
    
    this.vehicleStates.set(vehicle.vehicle_id, vehicleState)
    
    console.log(`🚚 Initialized vehicle ${vehicle.vehicle_id} with ${deliveryWaypoints.length} waypoints`)
    
    return vehicleState
  }
  
  /**
   * Update vehicle state during simulation
   */
  updateVehicle(vehicleId: string, update: VehicleUpdate): VehicleState | null {
    const state = this.vehicleStates.get(vehicleId)
    if (!state) return null
    
    // Update state
    state.currentPosition = update.position
    state.routeProgress = update.progress
    state.currentSpeed = update.speed
    state.deliveredPackages = [...update.deliveredPackages]
    state.lastUpdateTime = Date.now()
    
    // Handle route completion
    if (update.isComplete) {
      state.isActive = false
      state.currentSpeed = 0
      
      // Set final position to last delivery location
      if (update.finalPosition) {
        state.finalPosition = update.finalPosition
        state.currentPosition = update.finalPosition
        
        console.log(`🏁 Vehicle ${vehicleId} route complete. Final position: ${update.finalPosition}`)
      }
    }
    
    return state
  }
  
  /**
   * Start vehicle simulation
   */
  startVehicle(vehicleId: string): boolean {
    const state = this.vehicleStates.get(vehicleId)
    if (!state) return false
    
    state.isActive = true
    state.lastUpdateTime = Date.now()
    
    console.log(`🚀 Started vehicle ${vehicleId} simulation`)
    return true
  }
  
  /**
   * Stop vehicle simulation
   */
  stopVehicle(vehicleId: string): boolean {
    const state = this.vehicleStates.get(vehicleId)
    if (!state) return false
    
    state.isActive = false
    state.currentSpeed = 0
    
    console.log(`⏹️ Stopped vehicle ${vehicleId} simulation`)
    return true
  }
  
  /**
   * Get vehicle state
   */
  getVehicleState(vehicleId: string): VehicleState | null {
    return this.vehicleStates.get(vehicleId) || null
  }
  
  /**
   * Get all vehicle states
   */
  getAllVehicleStates(): VehicleState[] {
    return Array.from(this.vehicleStates.values())
  }
  
  /**
   * Check if vehicle has completed all deliveries
   */
  hasCompletedAllDeliveries(vehicleId: string): boolean {
    const state = this.vehicleStates.get(vehicleId)
    if (!state) return false
    
    const totalPackages = state.deliveryWaypoints.length
    const deliveredCount = state.deliveredPackages.length
    
    return deliveredCount > 0 && deliveredCount === totalPackages
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
    const state = this.vehicleStates.get(vehicleId)
    if (!state) return { total: 0, delivered: 0, remaining: 0, percentage: 0 }
    
    const total = state.deliveryWaypoints.length
    const delivered = state.deliveredPackages.length
    const remaining = total - delivered
    const percentage = total > 0 ? (delivered / total) * 100 : 0
    
    return { total, delivered, remaining, percentage }
  }
  
  /**
   * Get next delivery waypoint for vehicle
   */
  getNextDeliveryWaypoint(vehicleId: string): DeliveryWaypoint | null {
    const state = this.vehicleStates.get(vehicleId)
    if (!state) return null
    
    return state.deliveryWaypoints.find(waypoint => 
      !state.deliveredPackages.includes(waypoint.packageId) &&
      state.routeProgress < waypoint.routeProgress
    ) || null
  }
  
  /**
   * Get current delivery waypoint (if at one)
   */
  getCurrentDeliveryWaypoint(vehicleId: string): DeliveryWaypoint | null {
    const state = this.vehicleStates.get(vehicleId)
    if (!state) return null
    
    const tolerance = 0.01 // 1% tolerance
    
    return state.deliveryWaypoints.find(waypoint => 
      !state.deliveredPackages.includes(waypoint.packageId) &&
      Math.abs(state.routeProgress - waypoint.routeProgress) <= tolerance
    ) || null
  }
  
  /**
   * Remove vehicle from management
   */
  removeVehicle(vehicleId: string): boolean {
    const existed = this.vehicleStates.has(vehicleId)
    this.vehicleStates.delete(vehicleId)
    
    if (existed) {
      console.log(`🗑️ Removed vehicle ${vehicleId} from state management`)
    }
    
    return existed
  }
  
  /**
   * Clear all vehicle states
   */
  clearAllVehicles(): void {
    const count = this.vehicleStates.size
    this.vehicleStates.clear()
    
    console.log(`🧹 Cleared ${count} vehicle states`)
  }
  
  /**
   * Get summary of all vehicles
   */
  getFleetSummary(): {
    totalVehicles: number
    activeVehicles: number
    completedVehicles: number
    totalDeliveries: number
    completedDeliveries: number
  } {
    const states = Array.from(this.vehicleStates.values())
    
    const totalVehicles = states.length
    const activeVehicles = states.filter(s => s.isActive).length
    const completedVehicles = states.filter(s => !s.isActive && s.routeProgress >= 1).length
    const totalDeliveries = states.reduce((sum, s) => sum + s.deliveryWaypoints.length, 0)
    const completedDeliveries = states.reduce((sum, s) => sum + s.deliveredPackages.length, 0)
    
    return {
      totalVehicles,
      activeVehicles,
      completedVehicles,
      totalDeliveries,
      completedDeliveries
    }
  }
}