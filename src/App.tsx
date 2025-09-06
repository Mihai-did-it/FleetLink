import { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'

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

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isFleetPanelCollapsed, setIsFleetPanelCollapsed] = useState(false);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [showVehicleDrawer, setShowVehicleDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<'add-vehicle' | 'add-packages' | 'routes'>('add-vehicle');
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = 'pk.eyJ1IjoibW5pZmFpIiwiYSI6ImNtZjM5dng3dzAxZWYybHEwdmZ2MmE4MDkifQ.CGxxP82dHH4tu6V9D6FhHg';
    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 12,
      attributionControl: false,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Load vehicles from backend
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const response = await fetch('http://localhost:8000/vehicles');
        if (response.ok) {
          const data = await response.json();
          // Transform backend data to include packages
          const transformedVehicles = data.map((v: any) => ({
            ...v,
            status: v.status === 'active' ? 'on-time' : v.status,
            packages: [
              { id: 'PKG-001', destination: 'Downtown Mall', weight: 2.5, status: 'in-transit' },
              { id: 'PKG-002', destination: 'Tech Campus', weight: 1.2, status: 'pending' }
            ].slice(0, v.packages || 0),
            progress: v.status === 'active' ? Math.floor(Math.random() * 100) : 0
          }));
          setVehicles(transformedVehicles);
        }
      } catch (error) {
        // Fallback data
        setVehicles([
          {
            vehicle_id: "TRUCK-001",
            driver: "Mike Johnson",
            status: "on-time",
            location: "Downtown",
            speed: 35,
            packages: [
              { id: 'PKG-001', destination: 'Downtown Mall', weight: 2.5, status: 'in-transit' },
              { id: 'PKG-002', destination: 'Tech Campus', weight: 1.2, status: 'pending' }
            ],
            lat: 37.7749,
            lng: -122.4194,
            next_stop: "Downtown Mall",
            eta: "2:45 PM",
            progress: 65
          },
          {
            vehicle_id: "TRUCK-002",
            driver: "Sarah Chen",
            status: "delayed",
            location: "Highway 101",
            speed: 15,
            packages: [
              { id: 'PKG-003', destination: 'Airport', weight: 3.1, status: 'in-transit' }
            ],
            lat: 37.7849,
            lng: -122.4094,
            next_stop: "Airport Terminal",
            eta: "3:20 PM",
            progress: 30
          }
        ]);
      }
    };

    loadVehicles();
    const interval = setInterval(loadVehicles, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update map markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Add vehicle markers
    vehicles.forEach(vehicle => {
      if (vehicle.lat && vehicle.lng) {
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        el.innerHTML = `
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold cursor-pointer ${
            vehicle.status === 'on-time' ? 'bg-green-500' :
            vehicle.status === 'delayed' ? 'bg-red-500' :
            vehicle.status === 'active' ? 'bg-blue-500' : 'bg-gray-500'
          }">
            🚛
          </div>
        `;

        el.addEventListener('click', () => {
          setSelectedVehicle(vehicle);
          setShowVehicleDrawer(true);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map.current!);

        markers.current[vehicle.vehicle_id] = marker;
      }
    });
  }, [vehicles]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'text-green-400';
      case 'delayed': return 'text-red-400';
      case 'active': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'on-time': return 'bg-green-500/20 border-green-500/30';
      case 'delayed': return 'bg-red-500/20 border-red-500/30';
      case 'active': return 'bg-blue-500/20 border-blue-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      {/* Mapbox Background */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Fleet Overview Panel - Left Side */}
      <div className={`absolute top-6 left-6 transition-all duration-300 ${
        isFleetPanelCollapsed ? 'w-16' : 'w-96'
      }`}>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl h-[calc(100vh-3rem)]">
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            {!isFleetPanelCollapsed && (
              <h2 className="text-xl font-bold text-white">Fleet Overview</h2>
            )}
            <button
              onClick={() => setIsFleetPanelCollapsed(!isFleetPanelCollapsed)}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <div className="w-4 h-4 text-slate-400">
                {isFleetPanelCollapsed ? '→' : '←'}
              </div>
            </button>
          </div>

          {!isFleetPanelCollapsed && (
            <div className="p-4 flex flex-col h-full">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{vehicles.length}</div>
                  <div className="text-sm text-slate-400">Total</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-400">
                    {vehicles.filter(v => v.status === 'on-time').length}
                  </div>
                  <div className="text-sm text-slate-400">On Time</div>
                </div>
              </div>

              {/* Vehicle List */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className={`bg-slate-800/30 rounded-lg p-4 border cursor-pointer transition-all hover:bg-slate-700/30 ${
                      selectedVehicle?.vehicle_id === vehicle.vehicle_id
                        ? 'border-blue-500/50 bg-blue-900/20'
                        : 'border-slate-700/30'
                    }`}
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setShowVehicleDrawer(true);
                    }}
                  >
                    {/* Primary Info */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-white text-lg">{vehicle.vehicle_id}</div>
                        <div className="text-sm text-slate-400">{vehicle.driver}</div>
                      </div>
                      <div className={`px-2 py-1 rounded border text-xs font-medium ${getStatusBg(vehicle.status)}`}>
                        <span className={getStatusColor(vehicle.status)}>{vehicle.status}</span>
                      </div>
                    </div>

                    {/* Secondary Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">ETA:</span>
                        <span className="text-white">{vehicle.eta || '--'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Packages:</span>
                        <span className="text-white">{vehicle.packages.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Speed:</span>
                        <span className="text-white">{vehicle.speed} mph</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-400">Next: </span>
                        <span className="text-white">{vehicle.next_stop || 'Depot'}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      {vehicle.progress !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Progress</span>
                            <span>{vehicle.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${vehicle.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel - Top Right */}
      <div className={`absolute top-6 right-6 transition-all duration-300 ${
        isControlPanelCollapsed ? 'w-16' : 'w-80'
      }`}>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            {!isControlPanelCollapsed && (
              <h2 className="text-lg font-bold text-white">Controls</h2>
            )}
            <button
              onClick={() => setIsControlPanelCollapsed(!isControlPanelCollapsed)}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <div className="w-4 h-4 text-slate-400">
                {isControlPanelCollapsed ? '←' : '→'}
              </div>
            </button>
          </div>

          {!isControlPanelCollapsed && (
            <div className="p-4">
              {/* Tabs */}
              <div className="flex space-x-1 mb-4 bg-slate-800/50 rounded-lg p-1">
                {(['add-vehicle', 'add-packages', 'routes'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'add-vehicle' ? 'Vehicle' : tab === 'add-packages' ? 'Packages' : 'Routes'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeTab === 'add-vehicle' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Vehicle ID (e.g., TRUCK-005)"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Driver Name"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Initial Packages"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
                    />
                    <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                      Add Vehicle
                    </button>
                  </div>
                )}

                {activeTab === 'add-packages' && (
                  <div className="space-y-3">
                    <select className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm">
                      <option>Select Vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_id}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Package Destination"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Weight (lbs)"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
                    />
                    <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm">
                      Add Package
                    </button>
                  </div>
                )}

                {activeTab === 'routes' && (
                  <div className="space-y-3">
                    <select className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm">
                      <option>Select Vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_id}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Add Stop (name/address)"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
                    />
                    <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm">
                      Add Stop
                    </button>
                    <div className="pt-2 border-t border-slate-700/50">
                      <label className="flex items-center space-x-2 text-sm text-slate-300">
                        <input type="checkbox" className="rounded border-slate-600" defaultChecked />
                        <span>Return to depot</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-slate-700/50 mt-6">
                <button className="w-full px-4 py-2 bg-green-600/80 hover:bg-green-600 text-white rounded-lg transition-colors text-sm mb-2">
                  Start Simulation
                </button>
                <button className="w-full px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm">
                  Emergency Stop All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Details Drawer */}
      {showVehicleDrawer && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowVehicleDrawer(false)}
          />
          
          {/* Drawer */}
          <div className="w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedVehicle.vehicle_id}</h2>
                <button
                  onClick={() => setShowVehicleDrawer(false)}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <div className="w-4 h-4 text-slate-400">✕</div>
                </button>
              </div>
              
              <div className={`inline-flex px-3 py-1 rounded border text-sm font-medium ${getStatusBg(selectedVehicle.status)}`}>
                <span className={getStatusColor(selectedVehicle.status)}>{selectedVehicle.status}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Live Info */}
              <div className="bg-slate-800/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Live Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver:</span>
                    <span className="text-white">{selectedVehicle.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Speed:</span>
                    <span className="text-white">{selectedVehicle.speed} mph</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ETA:</span>
                    <span className="text-white">{selectedVehicle.eta || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Next Stop:</span>
                    <span className="text-white">{selectedVehicle.next_stop || 'Depot'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Updated:</span>
                    <span className="text-white">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Packages */}
              <div className="bg-slate-800/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Packages ({selectedVehicle.packages.length})
                </h3>
                <div className="space-y-2">
                  {selectedVehicle.packages.map((pkg) => (
                    <div key={pkg.id} className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
                      <div>
                        <div className="text-white text-sm font-medium">{pkg.id}</div>
                        <div className="text-slate-400 text-xs">{pkg.destination}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm">{pkg.weight} lbs</div>
                        <div className={`text-xs ${
                          pkg.status === 'delivered' ? 'text-green-400' :
                          pkg.status === 'in-transit' ? 'text-blue-400' : 'text-yellow-400'
                        }`}>
                          {pkg.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors">
                  Pause Vehicle
                </button>
                <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Edit Route
                </button>
                <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                  Remove Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar - Bottom */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl">
        <div className="px-6 py-3">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-slate-300">FleetLink Online</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">
              {vehicles.reduce((sum, v) => sum + v.packages.length, 0)} packages active
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
