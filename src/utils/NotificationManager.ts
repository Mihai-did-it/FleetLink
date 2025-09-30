// NotificationManager.ts - Clean notification system
import { toast } from '@/hooks/use-toast'

export interface DeliveryNotification {
  vehicleId: string
  packageId: string
  destination: string
  distanceMeters: number
}

export class NotificationManager {
  /**
   * Show delivery success notification
   */
  static showDeliverySuccess(notification: DeliveryNotification): void {
    toast({
      title: "📦 Package Delivered!",
      description: `Vehicle ${notification.vehicleId} delivered package to ${notification.destination}`,
      duration: 3000,
      className: "bg-green-50 border-green-200",
    })
  }

  /**
   * Show route completion notification (only for successful deliveries)
   */
  static showRouteComplete(vehicleId: string, deliveredCount: number): void {
    if (deliveredCount > 0) {
      toast({
        title: "🎉 Route Complete!",
        description: `Vehicle ${vehicleId} successfully delivered ${deliveredCount} packages`,
        duration: 4000,
        className: "bg-blue-50 border-blue-200",
      })
    }
    // Note: No notifications for incomplete deliveries as requested by user
  }

  /**
   * Show test notification
   */
  static showTestNotification(vehicleId: string, destination: string): void {
    toast({
      title: "🧪 TEST - Delivery Notification",
      description: `Test notification for vehicle ${vehicleId} - ${destination}`,
      duration: 3000,
      className: "bg-purple-50 border-purple-200",
    })
  }
}