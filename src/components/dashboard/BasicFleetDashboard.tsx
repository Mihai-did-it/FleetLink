import React, { useState, useEffect } from 'react';

interface Vehicle {
  vehicle_id: string;
  driver: string;
  status: string;
  location: string;
  speed: number;
  packages: number;
}

export function BasicFleetDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load vehicles from API or use fallback data
    const loadVehicles = async () => {
      try {
        const response = await fetch('http://localhost:8000/vehicles');
        if (response.ok) {
          const data = await response.json();
          setVehicles(data);
        } else {
          // Fallback data
          setVehicles([
            {
              vehicle_id: "TRUCK-001",
              driver: "Mike Johnson",
              status: "active",
              location: "Downtown",
              speed: 35,
              packages: 8
            },
            {
              vehicle_id: "TRUCK-002", 
              driver: "Sarah Chen",
              status: "idle",
              location: "Depot",
              speed: 0,
              packages: 0
            }
          ]);
        }
      } catch (error) {
        // Fallback data
        setVehicles([
          {
            vehicle_id: "TRUCK-001",
            driver: "Mike Johnson", 
            status: "active",
            location: "Downtown",
            speed: 35,
            packages: 8
          },
          {
            vehicle_id: "TRUCK-002",
            driver: "Sarah Chen", 
            status: "idle",
            location: "Depot",
            speed: 0,
            packages: 0
          }
        ]);
      }
    };

    loadVehicles();
    
    // Set up auto-refresh for live updates
    const interval = setInterval(loadVehicles, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSimulation = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:8000/simulate/start', { method: 'POST' });
      setIsSimulationRunning(true);
    } catch (error) {
      console.log('Simulation started (mock)');
      setIsSimulationRunning(true);
    }
    setLoading(false);
  };

  const handleStopSimulation = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:8000/simulate/stop', { method: 'POST' });
      setIsSimulationRunning(false);
    } catch (error) {
      console.log('Simulation stopped (mock)');
      setIsSimulationRunning(false);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-400';
      case 'idle': return 'text-yellow-400'; 
      case 'maintenance': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-400">FleetLink</h1>
              <p className="text-slate-300">Real-time Fleet Management</p>
            </div>
            
            {/* Simulation Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isSimulationRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                <span className="text-sm text-slate-300">
                  {isSimulationRunning ? 'Simulation Running' : 'Simulation Stopped'}
                </span>
              </div>
              
              {!isSimulationRunning ? (
                <button
                  onClick={handleStartSimulation}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg transition-colors"
                >
                  {loading ? 'Starting...' : 'Start Simulation'}
                </button>
              ) : (
                <button
                  onClick={handleStopSimulation}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
                >
                  {loading ? 'Stopping...' : 'Stop Simulation'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-lg p-6">
            <h3 className="text-sm font-medium text-slate-400">Total Vehicles</h3>
            <p className="text-2xl font-bold text-white">{vehicles.length}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-lg p-6">
            <h3 className="text-sm font-medium text-slate-400">Active</h3>
            <p className="text-2xl font-bold text-green-400">
              {vehicles.filter(v => v.status === 'active').length}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-lg p-6">
            <h3 className="text-sm font-medium text-slate-400">Total Packages</h3>
            <p className="text-2xl font-bold text-blue-400">
              {vehicles.reduce((sum, v) => sum + v.packages, 0)}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-lg p-6">
            <h3 className="text-sm font-medium text-slate-400">Avg Speed</h3>
            <p className="text-2xl font-bold text-white">
              {vehicles.length > 0 
                ? Math.round(vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length)
                : 0} mph
            </p>
          </div>
        </div>

        {/* Vehicle List */}
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-lg">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">Fleet Overview</h2>
          </div>
          <div className="p-6">
            {vehicles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Loading vehicles...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vehicles.map((vehicle) => (
                  <div 
                    key={vehicle.vehicle_id}
                    className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600 hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <h3 className="font-semibold text-white">{vehicle.vehicle_id}</h3>
                        <p className="text-sm text-slate-400">{vehicle.driver}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-400">Status</p>
                        <p className={`font-medium capitalize ${getStatusColor(vehicle.status)}`}>
                          {vehicle.status}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-slate-400">Location</p>
                        <p className="font-medium text-white">{vehicle.location}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-slate-400">Speed</p>
                        <p className="font-medium text-white">{vehicle.speed} mph</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-slate-400">Packages</p>
                        <p className="font-medium text-blue-400">{vehicle.packages}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
