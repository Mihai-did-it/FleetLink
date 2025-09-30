import { useToast } from '@/hooks/use-toast';

export interface DeliveryNotificationData {
  vehicleId: string;
  packageId: string;
  destination: string;
  recipientName?: string;
  weight: number;
}

export interface RecentDelivery {
  vehicleId: string;
  destination: string;
  timestamp: number;
}

/**
 * Handles all delivery-related notifications including toasts,
 * floating notifications, and delivery statistics
 */
export class NotificationSystem {
  
  /**
   * Show delivery notifications for completed deliveries
   */
  static showDeliveryNotifications(
    deliveries: DeliveryNotificationData[],
    toast: ReturnType<typeof useToast>['toast'],
    setRecentDeliveries: React.Dispatch<React.SetStateAction<RecentDelivery[]>>,
    setDeliveryStats: React.Dispatch<React.SetStateAction<any>>
  ) {
    console.log(`📢 Showing ${deliveries.length} delivery notifications`);
    
    deliveries.forEach(delivery => {
      // Show enhanced toast notification
      toast({
        title: "🎉 Package Delivered Successfully!",
        description: (
          <div className="space-y-1">
            <div className="font-medium text-green-700">Vehicle {delivery.vehicleId}</div>
            <div className="text-sm">📍 {delivery.destination}</div>
            <div className="text-xs text-slate-500">Package ID: {delivery.packageId}</div>
            {delivery.recipientName && (
              <div className="text-xs text-slate-500">Recipient: {delivery.recipientName}</div>
            )}
          </div>
        ),
        duration: 6000,
        className: "border-l-4 border-green-500 bg-green-50"
      });
      
      // Add to recent deliveries
      setRecentDeliveries(prev => [...prev, {
        vehicleId: delivery.vehicleId,
        destination: delivery.destination,
        timestamp: Date.now()
      }]);
      
      // Update delivery statistics
      setDeliveryStats((prev: any) => ({
        ...prev,
        totalDelivered: prev.totalDelivered + 1,
        deliveriesThisSession: prev.deliveriesThisSession + 1,
        lastDeliveryTime: new Date()
      }));
      
      console.log(`✅ Notification sent for delivery: ${delivery.packageId} to ${delivery.destination}`);
    });
  }
  
  /**
   * Create floating notification element (optional UI enhancement)
   */
  static createFloatingNotification(delivery: DeliveryNotificationData): HTMLElement {
    const notification = document.createElement('div');
    notification.className = 'delivery-floating-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
      z-index: 1000;
      font-weight: 600;
      animation: slideInRight 0.4s ease-out;
      max-width: 300px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 18px; margin-right: 8px;">🎉</span>
        <strong>Package Delivered!</strong>
      </div>
      <div style="font-size: 14px; opacity: 0.9;">
        Vehicle ${delivery.vehicleId} → ${delivery.destination}
      </div>
      <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
        Package: ${delivery.packageId}
      </div>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    
    if (!document.head.querySelector('style[data-delivery-animations]')) {
      style.setAttribute('data-delivery-animations', 'true');
      document.head.appendChild(style);
    }
    
    return notification;
  }
  
  /**
   * Add floating notification to page and auto-remove
   */
  static addFloatingNotification(delivery: DeliveryNotificationData, duration: number = 5000) {
    const notification = this.createFloatingNotification(delivery);
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideInRight 0.4s ease-out reverse';
        setTimeout(() => {
          notification.remove();
        }, 400);
      }
    }, duration);
  }
  
  /**
   * Play delivery sound notification (optional)
   */
  static playDeliverySound() {
    try {
      // Create a simple success sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Silently fail if audio is not supported
      console.log('Audio notification not available');
    }
  }
}