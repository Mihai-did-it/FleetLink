// SimulationManager.ts - Clean simulation state management
import { type VehicleWithPackages } from '../types'

export interface VehicleSimulationState {
  isActive: boolean
  currentPosition: [number, number]
  routeProgress: number // 0-1
  currentSpeed: number // km/h
  deliveredPackages: string[]
  animationFrame?: number
  lastUpdateTime?: number
  fastForward: number // speed multiplier
}

export interface SimulationState {
  [vehicleId: string]: VehicleSimulationState
}

export class SimulationManager {
  private static simulationState: SimulationState = {}

  /**
   * Initialize simulation state for a vehicle
   */
  static initializeVehicle(vehicleId: string, startPosition: [number, number]): void {
    this.simulationState[vehicleId] = {
      isActive: false,
      currentPosition: startPosition,
      routeProgress: 0,
      currentSpeed: 0,
      deliveredPackages: [],
      fastForward: 1,
      lastUpdateTime: Date.now()
    }
  }

  /**
   * Start simulation for a vehicle
   */
  static startVehicle(vehicleId: string): void {
    if (this.simulationState[vehicleId]) {
      this.simulationState[vehicleId].isActive = true
      this.simulationState[vehicleId].lastUpdateTime = Date.now()
    }
  }

  /**
   * Stop simulation for a vehicle
   */
  static stopVehicle(vehicleId: string): void {
    if (this.simulationState[vehicleId]) {
      this.simulationState[vehicleId].isActive = false
      this.simulationState[vehicleId].currentSpeed = 0
      if (this.simulationState[vehicleId].animationFrame) {
        cancelAnimationFrame(this.simulationState[vehicleId].animationFrame!)
      }
    }
  }

  /**
   * Update vehicle position and progress
   */
  static updateVehicle(
    vehicleId: string, 
    position: [number, number], 
    progress: number,
    speed: number,
    animationFrame?: number
  ): void {
    if (this.simulationState[vehicleId]) {
      this.simulationState[vehicleId].currentPosition = position
      this.simulationState[vehicleId].routeProgress = progress
      this.simulationState[vehicleId].currentSpeed = speed
      this.simulationState[vehicleId].animationFrame = animationFrame
      this.simulationState[vehicleId].lastUpdateTime = Date.now()
    }
  }

  /**
   * Add delivered package to vehicle state
   */
  static addDelivery(vehicleId: string, packageId: string): void {
    if (this.simulationState[vehicleId]) {
      if (!this.simulationState[vehicleId].deliveredPackages.includes(packageId)) {
        this.simulationState[vehicleId].deliveredPackages.push(packageId)
      }
    }
  }

  /**
   * Set simulation speed for vehicle
   */
  static setSpeed(vehicleId: string, fastForward: number): void {
    if (this.simulationState[vehicleId]) {
      this.simulationState[vehicleId].fastForward = fastForward
    }
  }

  /**
   * Get current state for a vehicle
   */
  static getVehicleState(vehicleId: string): VehicleSimulationState | null {
    return this.simulationState[vehicleId] || null
  }

  /**
   * Get all simulation states
   */
  static getAllStates(): SimulationState {
    return { ...this.simulationState }
  }

  /**
   * Reset simulation state for a vehicle
   */
  static resetVehicle(vehicleId: string, startPosition: [number, number]): void {
    this.stopVehicle(vehicleId)
    this.initializeVehicle(vehicleId, startPosition)
  }
}