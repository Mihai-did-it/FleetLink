import { VehicleWithPackages } from '@/types';
import { DeliverySystem, SimulationState, DeliveryResult } from './DeliverySystem';
import { NotificationSystem, DeliveryNotificationData } from './NotificationSystem';
import { MapPackageManager } from './MapPackageManager';

export interface VehicleSimulationCallbacks {
  onDelivery: (deliveries: DeliveryNotificationData[]) => void;
  onPositionUpdate: (vehicleId: string, position: [number, number], speed: number) => void;
  onSimulationComplete: (vehicleId: string) => void;
}

/**
 * Handles vehicle movement simulation with reliable delivery detection
 * that works at any simulation speed
 */
export class VehicleSimulation {
  private routeCoordinates: [number, number][];
  private vehicle: VehicleWithPackages;
  private callbacks: VehicleSimulationCallbacks;
  private packageManager?: MapPackageManager;
  
  constructor(
    vehicle: VehicleWithPackages,
    routeCoordinates: [number, number][],
    callbacks: VehicleSimulationCallbacks,
    packageManager?: MapPackageManager
  ) {
    this.vehicle = vehicle;
    this.routeCoordinates = routeCoordinates;
    this.callbacks = callbacks;
    this.packageManager = packageManager;
  }
  
  /**
   * Process a single simulation update frame
   */
  processSimulationFrame(
    simulationState: SimulationState,
    deltaTime: number
  ): SimulationState {
    
    if (!simulationState.isActive) {
      return simulationState;
    }
    
    // Calculate new position based on speed and time
    const newProgress = this.calculateNewProgress(simulationState, deltaTime);
    const newPosition = this.interpolatePosition(newProgress);
    const currentSpeed = this.getRealisticSpeed(newProgress, simulationState.speed);
    
    // Check for deliveries with enhanced detection
    const deliveryResult = DeliverySystem.checkDeliveries(
      this.vehicle,
      newProgress,
      newPosition,
      simulationState
    );
    
    // Handle new deliveries
    if (deliveryResult.newDeliveries.length > 0) {
      this.handleNewDeliveries(deliveryResult.newDeliveries);
    }
    
    // Update vehicle position on map
    this.callbacks.onPositionUpdate(this.vehicle.vehicle_id, newPosition, currentSpeed);
    
    // Check if simulation is complete
    const isComplete = newProgress >= 1.0;
    if (isComplete) {
      this.callbacks.onSimulationComplete(this.vehicle.vehicle_id);
    }
    
    return {
      ...simulationState,
      routeProgress: newProgress,
      currentPosition: newPosition,
      currentSpeed,
      deliveredPackages: deliveryResult.deliveredPackages,
      lastUpdateTime: Date.now(),
      isActive: !isComplete
    };
  }
  
  /**
   * Calculate new route progress accounting for simulation speed
   */
  private calculateNewProgress(state: SimulationState, deltaTime: number): number {
    // Convert speed to progress increment
    const speedMph = this.getRealisticSpeed(state.routeProgress, state.speed);
    const speedMps = speedMph * 0.44704; // Convert mph to m/s
    
    // Calculate total route distance
    const totalDistance = this.calculateRouteDistance();
    
    // Calculate distance traveled this frame (accounting for fast forward)
    const distanceTraveled = speedMps * deltaTime * state.fastForward;
    
    // Convert to progress increment
    const progressIncrement = distanceTraveled / Math.max(totalDistance, 100);
    
    const newProgress = Math.min(state.routeProgress + progressIncrement, 1.0);
    
    console.log(`🚗 Vehicle ${this.vehicle.vehicle_id} simulation:`, {
      progress: (newProgress * 100).toFixed(2) + '%',
      speed: speedMph.toFixed(1) + ' mph',
      fastForward: state.fastForward + 'x',
      progressIncrement: (progressIncrement * 100).toFixed(4) + '%'
    });
    
    return newProgress;
  }
  
  /**
   * Calculate total route distance in meters
   */
  private calculateRouteDistance(): number {
    let totalDistance = 0;
    
    for (let i = 1; i < this.routeCoordinates.length; i++) {
      totalDistance += this.calculateDistance(
        this.routeCoordinates[i - 1],
        this.routeCoordinates[i]
      );
    }
    
    return totalDistance * 1000; // Convert km to meters
  }
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Interpolate position along route based on progress
   */
  private interpolatePosition(progress: number): [number, number] {
    if (progress <= 0) return this.routeCoordinates[0];
    if (progress >= 1) return this.routeCoordinates[this.routeCoordinates.length - 1];
    
    const totalDistance = this.calculateRouteDistance() / 1000; // Convert back to km
    const targetDistance = totalDistance * progress;
    
    let accumulatedDistance = 0;
    
    for (let i = 1; i < this.routeCoordinates.length; i++) {
      const segmentDistance = this.calculateDistance(
        this.routeCoordinates[i - 1],
        this.routeCoordinates[i]
      );
      
      if (accumulatedDistance + segmentDistance >= targetDistance) {
        const segmentProgress = (targetDistance - accumulatedDistance) / segmentDistance;
        
        const [lon1, lat1] = this.routeCoordinates[i - 1];
        const [lon2, lat2] = this.routeCoordinates[i];
        
        return [
          lon1 + (lon2 - lon1) * segmentProgress,
          lat1 + (lat2 - lat1) * segmentProgress
        ];
      }
      
      accumulatedDistance += segmentDistance;
    }
    
    return this.routeCoordinates[this.routeCoordinates.length - 1];
  }
  
  /**
   * Get realistic speed with variation
   */
  private getRealisticSpeed(progress: number, baseSpeed: number): number {
    if (progress < 0.05) {
      // Accelerating from start
      return 10 + (baseSpeed - 10) * (progress / 0.05);
    } else if (progress > 0.95) {
      // Slowing down at end
      return baseSpeed - (baseSpeed - 15) * ((progress - 0.95) / 0.05);
    } else {
      // Normal driving with variation
      const variation = Math.sin(progress * Math.PI * 8) * 0.2;
      return baseSpeed + (baseSpeed * variation * 0.3);
    }
  }
  
  /**
   * Handle new deliveries detected
   */
  private handleNewDeliveries(newDeliveries: string[]) {
    const deliveryData = DeliverySystem.formatDeliveryInfo(this.vehicle, newDeliveries);
    
    // Update package markers
    if (this.packageManager) {
      newDeliveries.forEach(packageId => {
        this.packageManager!.updatePackageMarkerStatus(
          this.vehicle.vehicle_id,
          packageId,
          true
        );
      });
    }
    
    // Trigger notification callback
    const notificationData: DeliveryNotificationData[] = deliveryData.map(data => ({
      vehicleId: this.vehicle.vehicle_id,
      packageId: data.packageId,
      destination: data.destination,
      recipientName: data.recipientName,
      weight: data.weight
    }));
    
    this.callbacks.onDelivery(notificationData);
    
    console.log(`🎉 ${newDeliveries.length} deliveries processed for vehicle ${this.vehicle.vehicle_id}`);
  }
}