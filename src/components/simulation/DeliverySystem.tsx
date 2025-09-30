import { VehicleWithPackages } from '@/types';

export interface SimulationState {
  isActive: boolean;
  currentPosition: [number, number];
  routeProgress: number;
  speed: number;
  currentSpeed: number;
  deliveredPackages: string[];
  animationFrame?: number;
  lastUpdateTime?: number;
  fastForward: number;
  isDelivering: boolean;
  deliveryStartTime?: number;
  currentDeliveryPackage?: string;
}

export interface DeliveryResult {
  deliveredPackages: string[];
  newDeliveries: string[];
  isDelivering: boolean;
  deliveryStartTime?: number;
  currentDeliveryPackage?: string;
}

/**
 * Enhanced delivery detection system that accounts for simulation speed
 * and provides reliable waypoint-based delivery detection
 */
export class DeliverySystem {
  
  /**
   * Check for package deliveries based on route progress
   * This method accounts for simulation speed and ensures deliveries
   * are detected regardless of how fast the simulation is running
   */
  static checkDeliveries(
    vehicle: VehicleWithPackages, 
    progress: number, 
    currentPosition: [number, number],
    simulationState: SimulationState
  ): DeliveryResult {
    
    if (!vehicle.packages || vehicle.packages.length === 0) {
      return {
        deliveredPackages: [],
        newDeliveries: [],
        isDelivering: false
      };
    }
    
    const alreadyDelivered = simulationState.deliveredPackages || [];
    const totalPackages = vehicle.packages.length;
    
    console.log(`🚚 DELIVERY CHECK - Vehicle ${vehicle.vehicle_id}:`, {
      progress: (progress * 100).toFixed(2) + '%',
      alreadyDelivered: alreadyDelivered.length,
      totalPackages,
      fastForward: simulationState.fastForward
    });
    
    // Calculate delivery points based on route progress
    // Each package gets delivered at evenly spaced intervals along the route
    const deliveryThresholds = this.calculateDeliveryThresholds(totalPackages);
    
    const newDeliveries: string[] = [];
    const allDeliveredPackages = [...alreadyDelivered];
    
    // Check each package against its delivery threshold
    for (let i = 0; i < totalPackages; i++) {
      const pkg = vehicle.packages[i];
      const deliveryThreshold = deliveryThresholds[i];
      
      // Skip if already delivered
      if (alreadyDelivered.includes(pkg.package_id)) {
        continue;
      }
      
      // Check if vehicle has passed this delivery point
      if (progress >= deliveryThreshold) {
        console.log(`🎉 DELIVERY TRIGGERED! Package ${pkg.package_id}`, {
          packageIndex: i + 1,
          threshold: (deliveryThreshold * 100).toFixed(1) + '%',
          currentProgress: (progress * 100).toFixed(1) + '%',
          destination: pkg.destination
        });
        
        allDeliveredPackages.push(pkg.package_id);
        newDeliveries.push(pkg.package_id);
      }
    }
    
    return {
      deliveredPackages: allDeliveredPackages,
      newDeliveries,
      isDelivering: false // For now, no stopping behavior
    };
  }
  
  /**
   * Calculate evenly spaced delivery thresholds along the route
   * This ensures deliveries happen at predictable intervals
   */
  private static calculateDeliveryThresholds(packageCount: number): number[] {
    if (packageCount === 0) return [];
    
    const thresholds: number[] = [];
    
    // Deliver packages at evenly spaced intervals
    // First package at 20% of route, then evenly spaced
    const startThreshold = 0.2; // Start deliveries at 20% of route
    const endThreshold = 0.9;   // Finish deliveries by 90% of route
    const deliveryRange = endThreshold - startThreshold;
    
    if (packageCount === 1) {
      thresholds.push(0.5); // Single package delivered at midpoint
    } else {
      for (let i = 0; i < packageCount; i++) {
        const threshold = startThreshold + (deliveryRange * i) / (packageCount - 1);
        thresholds.push(threshold);
      }
    }
    
    console.log(`📊 Delivery thresholds calculated:`, thresholds.map(t => (t * 100).toFixed(1) + '%'));
    
    return thresholds;
  }
  
  /**
   * Format delivery information for logging and display
   */
  static formatDeliveryInfo(vehicle: VehicleWithPackages, newDeliveries: string[]): Array<{
    packageId: string;
    destination: string;
    recipientName?: string;
    weight: number;
  }> {
    return newDeliveries.map(packageId => {
      const pkg = vehicle.packages.find(p => p.package_id === packageId);
      return {
        packageId,
        destination: pkg?.destination || 'Unknown',
        recipientName: pkg?.recipient_name,
        weight: pkg?.weight || 0
      };
    }).filter(info => info.destination !== 'Unknown');
  }
}