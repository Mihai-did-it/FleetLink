import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://ncfqkcybnfncsklfdevj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnFrY3libmZuY3NrbGZkZXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyODAxMDgsImV4cCI6MjA3NDg1NjEwOH0.DY2U6yEGxPG0fy9NPYuZc84kqer6GjgWYX7lPKo6rdg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Vehicle {
  id: string
  vehicle_id: string
  driver: string
  status: 'active' | 'idle' | 'warning' | 'on-time' | 'delayed'
  lat: number
  lng: number
  speed: number
  location: string
  next_stop?: string
  eta?: string
  progress?: number
  created_at?: string
  updated_at?: string
}

export interface Package {
  id: string
  package_id: string
  vehicle_id: string
  destination: string
  destination_lat: number
  destination_lng: number
  weight: number
  status: 'pending' | 'in-transit' | 'delivered'
  priority: 'low' | 'medium' | 'high'
  recipient_name?: string
  package_type?: string
  estimated_delivery_time?: string
  actual_delivery_time?: string
  created_at?: string
  updated_at?: string
}

export interface DeliveryRoute {
  id: string
  vehicle_id: string
  route_geometry: any // GeoJSON
  total_distance: number
  total_duration: number
  waypoints: any[] // Array of waypoint objects
  is_optimized: boolean
  created_at?: string
  updated_at?: string
}

// Database table names
export const TABLES = {
  VEHICLES: 'vehicles',
  PACKAGES: 'packages',
  ROUTES: 'routes'
} as const