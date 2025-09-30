// DeliveryMarkerManager.ts - Manages delivery target and completion markers
import mapboxgl from 'mapbox-gl'
import { DeliveryWaypoint } from './WaypointDeliverySystem'

export interface MarkerInfo {
  packageId: string
  marker: mapboxgl.Marker
  isDelivered: boolean
  coordinates: [number, number]
  destination: string
}

/**
 * Manages delivery markers on the map - targets before delivery, packages after delivery
 */
export class DeliveryMarkerManager {
  private markers: Map<string, MarkerInfo> = new Map()
  private map: mapboxgl.Map
  
  constructor(map: mapboxgl.Map) {
    this.map = map
  }
  
  /**
   * Create target markers for all delivery waypoints
   */
  addDeliveryTargets(waypoints: DeliveryWaypoint[]): void {
    console.log(`🎯 Adding ${waypoints.length} delivery target markers`)
    
    waypoints.forEach(waypoint => {
      const targetElement = this.createTargetElement()
      
      const marker = new mapboxgl.Marker(targetElement)
        .setLngLat(waypoint.coordinates)
        .addTo(this.map)
      
      // Add popup with package info
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="delivery-target-popup">
            <h3>🎯 Delivery Target</h3>
            <p><strong>Package:</strong> ${waypoint.packageId}</p>
            <p><strong>Destination:</strong> ${waypoint.destination}</p>
            <p><strong>Route Progress:</strong> ${(waypoint.routeProgress * 100).toFixed(1)}%</p>
          </div>
        `)
      
      marker.setPopup(popup)
      
      this.markers.set(waypoint.packageId, {
        packageId: waypoint.packageId,
        marker,
        isDelivered: false,
        coordinates: waypoint.coordinates,
        destination: waypoint.destination
      })
      
      console.log(`🎯 Target marker added for package ${waypoint.packageId} at ${waypoint.destination}`)
    })
  }
  
  /**
   * Convert target marker to delivery completion marker
   */
  markAsDelivered(packageId: string): void {
    const markerInfo = this.markers.get(packageId)
    if (!markerInfo || markerInfo.isDelivered) return
    
    console.log(`📦 Converting target to delivery marker for package ${packageId}`)
    
    // Remove old target marker
    markerInfo.marker.remove()
    
    // Create new delivery completion marker
    const deliveryElement = this.createDeliveryElement()
    
    const newMarker = new mapboxgl.Marker(deliveryElement)
      .setLngLat(markerInfo.coordinates)
      .addTo(this.map)
    
    // Update popup for completed delivery
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div class="delivery-complete-popup">
          <h3>📦 Package Delivered!</h3>
          <p><strong>Package:</strong> ${packageId}</p>
          <p><strong>Destination:</strong> ${markerInfo.destination}</p>
          <p><strong>Status:</strong> ✅ Delivered</p>
        </div>
      `)
    
    newMarker.setPopup(popup)
    
    // Update marker info
    markerInfo.marker = newMarker
    markerInfo.isDelivered = true
    
    // Add delivery animation
    this.addDeliveryAnimation(markerInfo.coordinates)
  }
  
  /**
   * Highlight the next delivery target
   */
  highlightNextTarget(packageId: string): void {
    const markerInfo = this.markers.get(packageId)
    if (!markerInfo || markerInfo.isDelivered) return
    
    console.log(`⭐ Highlighting next target: ${packageId}`)
    
    // Remove existing marker
    markerInfo.marker.remove()
    
    // Create highlighted target marker
    const highlightedElement = this.createHighlightedTargetElement()
    
    const newMarker = new mapboxgl.Marker(highlightedElement)
      .setLngLat(markerInfo.coordinates)
      .addTo(this.map)
    
    // Update popup for next target
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div class="next-target-popup">
          <h3>⭐ Next Delivery</h3>
          <p><strong>Package:</strong> ${packageId}</p>
          <p><strong>Destination:</strong> ${markerInfo.destination}</p>
          <p><strong>Status:</strong> 🚚 En Route</p>
        </div>
      `)
    
    newMarker.setPopup(popup)
    markerInfo.marker = newMarker
  }
  
  /**
   * Remove highlight from target marker
   */
  removeHighlight(packageId: string): void {
    const markerInfo = this.markers.get(packageId)
    if (!markerInfo || markerInfo.isDelivered) return
    
    // Remove existing marker
    markerInfo.marker.remove()
    
    // Create normal target marker
    const targetElement = this.createTargetElement()
    
    const newMarker = new mapboxgl.Marker(targetElement)
      .setLngLat(markerInfo.coordinates)
      .addTo(this.map)
    
    markerInfo.marker = newMarker
  }
  
  /**
   * Create target marker element (🎯)
   */
  private createTargetElement(): HTMLElement {
    const element = document.createElement('div')
    element.className = 'delivery-target-marker'
    element.innerHTML = '🎯'
    element.style.cssText = `
      font-size: 24px;
      cursor: pointer;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      border: 2px solid #ff6b6b;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
    `
    
    // Add hover effect
    element.addEventListener('mouseenter', () => {
      element.style.transform = 'scale(1.2)'
    })
    element.addEventListener('mouseleave', () => {
      element.style.transform = 'scale(1)'
    })
    
    return element
  }
  
  /**
   * Create highlighted target marker element (⭐🎯)
   */
  private createHighlightedTargetElement(): HTMLElement {
    const element = document.createElement('div')
    element.className = 'delivery-target-highlighted'
    element.innerHTML = '⭐'
    element.style.cssText = `
      font-size: 28px;
      cursor: pointer;
      border-radius: 50%;
      background: rgba(255, 235, 59, 0.95);
      border: 3px solid #ffc107;
      padding: 6px;
      box-shadow: 0 4px 12px rgba(255, 193, 7, 0.5);
      animation: pulse 2s infinite;
      transition: transform 0.2s ease;
    `
    
    // Add CSS animation
    if (!document.querySelector('#delivery-marker-styles')) {
      const style = document.createElement('style')
      style.id = 'delivery-marker-styles'
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 4px 12px rgba(255, 193, 7, 0.5); }
          50% { box-shadow: 0 6px 20px rgba(255, 193, 7, 0.8); }
          100% { box-shadow: 0 4px 12px rgba(255, 193, 7, 0.5); }
        }
      `
      document.head.appendChild(style)
    }
    
    return element
  }
  
  /**
   * Create delivery completion marker element (📦)
   */
  private createDeliveryElement(): HTMLElement {
    const element = document.createElement('div')
    element.className = 'delivery-complete-marker'
    element.innerHTML = '📦'
    element.style.cssText = `
      font-size: 24px;
      cursor: pointer;
      border-radius: 50%;
      background: rgba(76, 175, 80, 0.9);
      border: 2px solid #4caf50;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
    `
    
    // Add hover effect
    element.addEventListener('mouseenter', () => {
      element.style.transform = 'scale(1.1)'
    })
    element.addEventListener('mouseleave', () => {
      element.style.transform = 'scale(1)'
    })
    
    return element
  }
  
  /**
   * Add delivery animation effect
   */
  private addDeliveryAnimation(coordinates: [number, number]): void {
    // Create temporary animated element
    const animationElement = document.createElement('div')
    animationElement.innerHTML = '✨'
    animationElement.style.cssText = `
      font-size: 32px;
      position: absolute;
      pointer-events: none;
      animation: deliveryBurst 1.5s ease-out forwards;
      z-index: 1000;
    `
    
    // Add animation CSS if not exists
    if (!document.querySelector('#delivery-animation-styles')) {
      const style = document.createElement('style')
      style.id = 'delivery-animation-styles'
      style.textContent = `
        @keyframes deliveryBurst {
          0% { 
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          50% { 
            transform: scale(1.5) rotate(180deg);
            opacity: 0.8;
          }
          100% { 
            transform: scale(3) rotate(360deg);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }
    
    const tempMarker = new mapboxgl.Marker(animationElement)
      .setLngLat(coordinates)
      .addTo(this.map)
    
    // Remove after animation
    setTimeout(() => {
      tempMarker.remove()
    }, 1500)
  }
  
  /**
   * Clear all markers
   */
  clearAllMarkers(): void {
    console.log(`🧹 Clearing ${this.markers.size} delivery markers`)
    
    this.markers.forEach(markerInfo => {
      markerInfo.marker.remove()
    })
    
    this.markers.clear()
  }
  
  /**
   * Get delivery status summary
   */
  getDeliveryStatus(): { total: number; delivered: number; remaining: number } {
    const total = this.markers.size
    const delivered = Array.from(this.markers.values()).filter(m => m.isDelivered).length
    const remaining = total - delivered
    
    return { total, delivered, remaining }
  }
}