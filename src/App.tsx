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

interface NewVehicle {
  id: string;
  driver: string;
  lat: number;
  lng: number;
}

interface NewPackage {
  vehicleId: string;
  destination: string;
  weight: number;
}

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isFleetPanelCollapsed, setIsFleetPanelCollapsed] = useState(false);
  const [showVehicleDrawer, setShowVehicleDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState<'fleet' | 'add-vehicle' | 'add-packages' | 'routes'>('fleet');
  const [isConnected, setIsConnected] = useState(false);
  
  // Form states
  const [newVehicle, setNewVehicle] = useState<NewVehicle>({ id: '', driver: '', lat: 37.7749, lng: -122.4194 });
  const [newPackage, setNewPackage] = useState<NewPackage>({ vehicleId: '', destination: '', weight: 0 });
  
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
      style: 'mapbox://styles/mapbox/light-v11', // Light theme
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

  // Load vehicles from backend - no default data
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const response = await fetch('http://localhost:8000/vehicles');
        if (response.ok) {
          const data = await response.json();
          setVehicles(data.map((v: any) => ({
            ...v,
            status: v.status === 'active' ? 'on-time' : v.status,
            packages: v.packages || [],
            progress: v.status === 'active' ? Math.floor(Math.random() * 100) : 0
          })));
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        setIsConnected(false);
        // No fallback data - empty until vehicles are added
        setVehicles([]);
      }
    };

    loadVehicles();
    const interval = setInterval(loadVehicles, 5000);
    return () => clearInterval(interval);
  }, []);

  // Add vehicle function
  const addVehicle = async () => {
    if (!newVehicle.id || !newVehicle.driver) return;
    
    try {
      const response = await fetch('http://localhost:8000/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: newVehicle.id,
          driver: newVehicle.driver,
          lat: newVehicle.lat,
          lng: newVehicle.lng,
          status: 'idle',
          speed: 0,
          location: 'Added via interface'
        })
      });
      
      if (response.ok) {
        setNewVehicle({ id: '', driver: '', lat: 37.7749, lng: -122.4194 });
        // Refresh vehicles list
        const vehiclesResponse = await fetch('http://localhost:8000/vehicles');
        if (vehiclesResponse.ok) {
          const data = await vehiclesResponse.json();
          setVehicles(data);
        }
      }
    } catch (error) {
      console.error('Failed to add vehicle:', error);
    }
  };

  // Add package function
  const addPackage = async () => {
    if (!newPackage.vehicleId || !newPackage.destination || !newPackage.weight) return;
    
    // For now, add to local state - in real app would sync with backend
    setVehicles(prev => prev.map(v => 
      v.vehicle_id === newPackage.vehicleId 
        ? {
            ...v, 
            packages: [...v.packages, {
              id: `PKG-${Date.now()}`,
              destination: newPackage.destination,
              weight: newPackage.weight,
              status: 'pending' as const
            }]
          }
        : v
    ));
    
    setNewPackage({ vehicleId: '', destination: '', weight: 0 });
  };

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
          <div class="w-10 h-10 rounded-full border-3 border-white shadow-xl flex items-center justify-center text-white font-bold cursor-pointer transition-all hover:scale-110 ${
            vehicle.status === 'on-time' ? 'bg-emerald-500' :
            vehicle.status === 'delayed' ? 'bg-rose-500' :
            vehicle.status === 'active' ? 'bg-blue-500' : 'bg-slate-400'
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
      case 'on-time': return 'text-emerald-600';
      case 'delayed': return 'text-rose-600';
      case 'active': return 'text-blue-600';
      default: return 'text-slate-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'on-time': return 'bg-emerald-50 border-emerald-200';
      case 'delayed': return 'bg-rose-50 border-rose-200';
      case 'active': return 'bg-blue-50 border-blue-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-50">
      {/* Mapbox Background - Full Screen */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* FleetLink Title */}
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  FleetLink
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <span className="text-sm text-slate-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="flex items-center space-x-2">
                {['fleet', 'add-vehicle', 'add-packages', 'routes'].map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeSection === section
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
                    }`}
                  >
                    {section === 'fleet' ? 'Fleet' : 
                     section === 'add-vehicle' ? 'Add Vehicle' :
                     section === 'add-packages' ? 'Add Packages' : 'Routes'}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Vehicles:</span>
                  <span className="font-semibold text-slate-800">{vehicles.length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Packages:</span>
                  <span className="font-semibold text-slate-800">
                    {vehicles.reduce((sum, v) => sum + v.packages.length, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Panel - Ultra Sleek Glass */}
      <div className={`absolute top-24 left-6 transition-all duration-500 ease-out ${
        isFleetPanelCollapsed ? 'w-16' : 'w-80'
      }`}>
        <div className="bg-white/30 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl shadow-black/10 h-[calc(100vh-8rem)]">
          {/* Collapse Button */}
          <div className="absolute -right-3 top-4 z-10">
            <button
              onClick={() => setIsFleetPanelCollapsed(!isFleetPanelCollapsed)}
              className="w-6 h-6 bg-white/80 backdrop-blur-xl border border-white/30 rounded-full shadow-lg flex items-center justify-center hover:bg-white/90 transition-all"
            >
              <div className="w-3 h-3 text-slate-600 text-xs">
                {isFleetPanelCollapsed ? '→' : '←'}
              </div>
            </button>
          </div>

          {!isFleetPanelCollapsed && (
            <div className="p-5 flex flex-col h-full">
              {/* Content based on active section */}
              {activeSection === 'fleet' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Fleet Overview</h3>
                  
                  {vehicles.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-3">🚛</div>
                        <div className="text-slate-600 text-sm">No vehicles added yet</div>
                        <div className="text-slate-500 text-xs mt-1">Add a vehicle to get started</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {vehicles.map((vehicle) => (
                        <div
                          key={vehicle.vehicle_id}
                          className={`bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30 cursor-pointer transition-all hover:bg-white/50 hover:shadow-lg ${
                            selectedVehicle?.vehicle_id === vehicle.vehicle_id
                              ? 'ring-2 ring-blue-400 bg-white/60'
                              : ''
                          }`}
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setShowVehicleDrawer(true);
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold text-slate-800 text-base">{vehicle.vehicle_id}</div>
                              <div className="text-sm text-slate-600">{vehicle.driver}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${getStatusBg(vehicle.status)}`}>
                              <span className={getStatusColor(vehicle.status)}>{vehicle.status}</span>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Speed:</span>
                              <span className="text-slate-800 font-medium">{vehicle.speed} mph</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Packages:</span>
                              <span className="text-slate-800 font-medium">{vehicle.packages.length}</span>
                            </div>
                            
                            {vehicle.progress !== undefined && (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                  <span>Progress</span>
                                  <span>{vehicle.progress}%</span>
                                </div>
                                <div className="w-full bg-white/50 rounded-full h-2">
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
                  )}
                </>
              )}

              {activeSection === 'add-vehicle' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Add New Vehicle</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle ID</label>
                      <input
                        type="text"
                        placeholder="e.g., TRUCK-003"
                        value={newVehicle.id}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, id: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Driver Name</label>
                      <input
                        type="text"
                        placeholder="Driver full name"
                        value={newVehicle.driver}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, driver: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={newVehicle.lat}
                          onChange={(e) => setNewVehicle(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                          className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={newVehicle.lng}
                          onChange={(e) => setNewVehicle(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                          className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <button
                      onClick={addVehicle}
                      disabled={!newVehicle.id || !newVehicle.driver}
                      className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                    >
                      Add Vehicle
                    </button>
                  </div>
                </>
              )}

              {activeSection === 'add-packages' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Package</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select Vehicle</label>
                      <select
                        value={newPackage.vehicleId}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, vehicleId: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      >
                        <option value="">Choose vehicle...</option>
                        {vehicles.map(v => (
                          <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_id} - {v.driver}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
                      <input
                        type="text"
                        placeholder="Package destination"
                        value={newPackage.destination}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, destination: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Weight (lbs)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newPackage.weight || ''}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={addPackage}
                      disabled={!newPackage.vehicleId || !newPackage.destination || !newPackage.weight}
                      className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                    >
                      Add Package
                    </button>
                  </div>
                </>
              )}

              {activeSection === 'routes' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Route Planning</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select Vehicle</label>
                      <select className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                        <option>Choose vehicle...</option>
                        {vehicles.map(v => (
                          <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_id}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Add Stop</label>
                      <input
                        type="text"
                        placeholder="Stop location"
                        className="w-full px-3 py-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-lg text-slate-800 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <button className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium shadow-lg">
                      Add Stop
                    </button>
                    <div className="pt-3 border-t border-white/20">
                      <label className="flex items-center space-x-2 text-sm text-slate-700">
                        <input type="checkbox" className="rounded border-white/30" defaultChecked />
                        <span>Return to depot</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Details Drawer */}
      {showVehicleDrawer && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/10 backdrop-blur-sm"
            onClick={() => setShowVehicleDrawer(false)}
          />
          
          {/* Drawer */}
          <div className="w-96 bg-white/30 backdrop-blur-2xl border-l border-white/20 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800">{selectedVehicle.vehicle_id}</h2>
                <button
                  onClick={() => setShowVehicleDrawer(false)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <div className="w-4 h-4 text-slate-600">✕</div>
                </button>
              </div>
              
              <div className={`inline-flex px-3 py-1 rounded-lg border text-sm font-medium ${getStatusBg(selectedVehicle.status)}`}>
                <span className={getStatusColor(selectedVehicle.status)}>{selectedVehicle.status}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Live Info */}
              <div className="bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Live Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Driver:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Speed:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.speed} mph</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ETA:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.eta || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Next Stop:</span>
                    <span className="text-slate-800 font-medium">{selectedVehicle.next_stop || 'Depot'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Last Updated:</span>
                    <span className="text-slate-800 font-medium">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Packages */}
              <div className="bg-white/40 backdrop-blur-xl rounded-xl p-4 border border-white/30">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                  Packages ({selectedVehicle.packages.length})
                </h3>
                {selectedVehicle.packages.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-2xl mb-2">📦</div>
                    <div className="text-slate-600 text-sm">No packages assigned</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedVehicle.packages.map((pkg) => (
                      <div key={pkg.id} className="flex justify-between items-center p-3 bg-white/30 backdrop-blur-xl rounded-lg border border-white/20">
                        <div>
                          <div className="text-slate-800 text-sm font-medium">{pkg.id}</div>
                          <div className="text-slate-600 text-xs">{pkg.destination}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-800 text-sm font-medium">{pkg.weight} lbs</div>
                          <div className={`text-xs font-medium ${
                            pkg.status === 'delivered' ? 'text-emerald-600' :
                            pkg.status === 'in-transit' ? 'text-blue-600' : 'text-amber-600'
                          }`}>
                            {pkg.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium shadow-lg">
                  Pause Vehicle
                </button>
                <button className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-lg">
                  Edit Route
                </button>
                <button className="w-full px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors font-medium shadow-lg">
                  Remove Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
