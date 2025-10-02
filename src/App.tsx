import { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'
import { useAuth } from './components/auth/AuthProvider'
import { LoginForm } from './components/auth/LoginForm'
import FleetLinkApp from './FleetLinkApp'

// Types
interface Package {
  id: string;
  destination: string;
  weight: number;
  status: 'pending' | 'in-transit' | 'delivered';
}

interface Vehicle {
  vehicle_id: string;
  driver: string;
  status: 'on-time' | 'delayed' | 'idle' | 'active';
  location: string;
  speed: number;
  packages: Package[];
  lat?: number;
  lng?: number;
  next_stop?: string;
  eta?: string;
  progress?: number; // 0-100 for progress bar
}

interface NewVehicle {
  id: string;
  driver: string;
  location: string;
}

interface NewPackage {
  vehicleId: string;
  destination: string;
  weight: number;
}

interface LocationSuggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export default function App() {
  const { user, loading } = useAuth()

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-600">Loading FleetLink Pro...</div>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm />
  }

  // Show main app if authenticated
  return <FleetLinkApp />
}


