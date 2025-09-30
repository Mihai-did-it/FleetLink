import mapboxgl from 'mapbox-gl';
import { VehicleWithPackages } from '@/types';
import { SimulationState } from './DeliverySystem';

export interface PackageMarkerManager {
  addPackageMarkers: (vehicle: VehicleWithPackages, simulationState: { [vehicleId: string]: SimulationState }) => void;
  updatePackageMarkerStatus: (vehicleId: string, packageId: string, isDelivered: boolean) => void;
  removeAllPackageMarkers: (vehicleId: string) => void;
}

/**
 * Manages package markers on the map with real-time status updates
 */
export class MapPackageManager {
  private map: mapboxgl.Map;
  private markers: { [markerId: string]: mapboxgl.Marker } = {};
  
  constructor(map: mapboxgl.Map) {
    this.map = map;
  }
  
  /**
   * Add package markers to show delivery locations clearly on the map
   */
  addPackageMarkers(vehicle: VehicleWithPackages, simulationState: { [vehicleId: string]: SimulationState }) {
    if (!this.map || !vehicle.packages) return;

    console.log(`📦 Adding package markers for vehicle ${vehicle.vehicle_id}:`, vehicle.packages.length);

    vehicle.packages.forEach((pkg, index) => {
      if (!pkg.destination_lat || !pkg.destination_lng) {
        console.warn(`⚠️ Package ${pkg.package_id} missing coordinates`);
        return;
      }

      const markerId = `package-${vehicle.vehicle_id}-${pkg.package_id}`;
      
      // Remove existing marker if it exists
      this.removeMarker(markerId);

      const vehicleState = simulationState[vehicle.vehicle_id];
      const isDelivered = vehicleState?.deliveredPackages?.includes(pkg.package_id) || false;

      const marker = this.createPackageMarker(pkg, vehicle.vehicle_id, isDelivered, index + 1);
      
      this.markers[markerId] = marker;
      console.log(`📍 Package marker added: ${markerId} at [${pkg.destination_lat}, ${pkg.destination_lng}] - delivered: ${isDelivered}`);
    });
  }
  
  /**
   * Create a package marker element with popup
   */
  private createPackageMarker(pkg: any, vehicleId: string, isDelivered: boolean, packageNumber: number): mapboxgl.Marker {
    const el = document.createElement('div');
    el.className = `package-marker ${isDelivered ? 'delivered' : 'pending'}`;
    el.style.cssText = `
      width: 32px; 
      height: 32px; 
      border-radius: 6px; 
      border: 3px solid white;
      box-shadow: 0 3px 12px rgba(0,0,0,0.4); 
      cursor: pointer;
      background-color: ${isDelivered ? '#10B981' : '#EF4444'};
      display: flex; 
      align-items: center; 
      justify-content: center;
      font-weight: bold; 
      color: white; 
      font-size: 14px; 
      z-index: 300;
      transform: translateY(-50%);
      transition: all 0.3s ease;
      position: relative;
    `;
    
    // Add package content
    if (isDelivered) {
      el.innerHTML = '✓';
      el.style.fontSize = '16px';
    } else {
      el.innerHTML = packageNumber.toString();
      el.style.fontSize = '12px';
    }
    
    // Add hover effect
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'translateY(-50%) scale(1.1)';
      el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translateY(-50%) scale(1)';
      el.style.boxShadow = '0 3px 12px rgba(0,0,0,0.4)';
    });

    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false
    }).setHTML(`
      <div style="padding: 14px; min-width: 220px; font-family: system-ui;">
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 18px; margin-right: 10px;">${isDelivered ? '✅' : '📦'}</span>
          <strong style="color: ${isDelivered ? '#10B981' : '#F59E0B'}; font-size: 16px;">
            ${isDelivered ? 'Delivered' : `Package #${packageNumber}`}
          </strong>
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Package ID:</strong> 
          <span style="color: #6B7280; font-family: monospace;">${pkg.package_id}</span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Destination:</strong> 
          <span style="color: #6B7280;">${pkg.destination}</span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Recipient:</strong> 
          <span style="color: #6B7280;">${pkg.recipient_name || 'N/A'}</span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Weight:</strong> 
          <span style="color: #6B7280;">${(pkg.weight * 2.20462).toFixed(1)} lbs</span>
        </div>
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
          <div style="font-size: 12px; color: ${isDelivered ? '#10B981' : '#F59E0B'}; font-weight: 600;">
            ${isDelivered ? '✓ Delivered by' : '🚛 Assigned to'} Vehicle ${vehicleId}
          </div>
        </div>
      </div>
    `);

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
    .setLngLat([pkg.destination_lng, pkg.destination_lat])
    .setPopup(popup)
    .addTo(this.map);

    return marker;
  }
  
  /**
   * Update package marker to show delivered status with animation
   */
  updatePackageMarkerStatus(vehicleId: string, packageId: string, isDelivered: boolean) {
    const markerId = `package-${vehicleId}-${packageId}`;
    const marker = this.markers[markerId];
    
    if (marker) {
      const el = marker.getElement();
      if (el) {
        // Animate the change
        el.style.transition = 'all 0.5s ease';
        el.style.backgroundColor = isDelivered ? '#10B981' : '#EF4444';
        el.innerHTML = isDelivered ? '✓' : '📦';
        el.style.fontSize = isDelivered ? '16px' : '14px';
        
        // Add delivery animation
        if (isDelivered) {
          el.style.transform = 'translateY(-50%) scale(1.3)';
          setTimeout(() => {
            el.style.transform = 'translateY(-50%) scale(1)';
          }, 300);
          
          // Update the popup content
          const popup = marker.getPopup();
          if (popup) {
            // Popup content would need to be regenerated here
            // For now, just close it so it refreshes on next open
            popup.remove();
          }
        }
        
        console.log(`📍 Updated package marker ${markerId} - delivered: ${isDelivered}`);
      }
    } else {
      console.warn(`⚠️ Package marker not found: ${markerId}`);
    }
  }
  
  /**
   * Remove a specific marker
   */
  private removeMarker(markerId: string) {
    if (this.markers[markerId]) {
      this.markers[markerId].remove();
      delete this.markers[markerId];
    }
  }
  
  /**
   * Remove all package markers for a vehicle
   */
  removeAllPackageMarkers(vehicleId: string) {
    const markerIdsToRemove = Object.keys(this.markers).filter(id => 
      id.startsWith(`package-${vehicleId}-`)
    );
    
    markerIdsToRemove.forEach(markerId => {
      this.removeMarker(markerId);
    });
    
    console.log(`🗑️ Removed ${markerIdsToRemove.length} package markers for vehicle ${vehicleId}`);
  }
  
  /**
   * Get all markers for debugging
   */
  getAllMarkers() {
    return { ...this.markers };
  }
}