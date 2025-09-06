const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data store
let vehicles = [
  {
    vehicle_id: "TRUCK-001",
    driver: "Mike Johnson",
    status: "idle",
    location: "Depot",
    lat: 37.7749,
    lon: -122.4194,
    speed: 0,
    next_stop: "Awaiting Assignment",
    packages: 5,
    eta: "--"
  },
  {
    vehicle_id: "TRUCK-002",
    driver: "Sarah Chen",
    status: "idle",
    location: "Depot", 
    lat: 37.7849,
    lon: -122.4094,
    speed: 0,
    next_stop: "Awaiting Assignment",
    packages: 3,
    eta: "--"
  }
];

let drivers = [];
let trafficEvents = [];
let alerts = [];
let activityLog = [];
let simulationState = {
  isRunning: false,
  isPaused: false
};

// Simulation variables
let simulationInterval = null;
let eventGenerationInterval = null;

// Helper functions
function addActivity(action, driver = "System") {
  const activity = {
    id: activityLog.length + 1,
    action,
    driver,
    time: "Just now"
  };
  activityLog.unshift(activity);
  if (activityLog.length > 50) activityLog.pop();
}

function addAlert(message, type = "info") {
  const alert = {
    id: alerts.length + 1,
    message,
    type,
    time: "Just now"
  };
  alerts.unshift(alert);
  if (alerts.length > 20) alerts.pop();
}

function generateRandomLocation() {
  const locations = [
    "Downtown District", "Industrial Zone", "Tech Campus", 
    "Shopping Center", "Warehouse District", "City Center",
    "Residential Area", "Business Park", "Airport Zone"
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

function generateRandomCoordinates(baseLatitude = 37.7749, baseLongitude = -122.4194, radius = 0.1) {
  const randomLat = baseLatitude + (Math.random() - 0.5) * radius;
  const randomLon = baseLongitude + (Math.random() - 0.5) * radius;
  return { lat: randomLat, lon: randomLon };
}

function updateVehiclePosition(vehicle) {
  if (vehicle.status === 'active') {
    // Move vehicle slightly for simulation
    const moveDistance = 0.001; // Small movement
    vehicle.lat += (Math.random() - 0.5) * moveDistance;
    vehicle.lon += (Math.random() - 0.5) * moveDistance;
    
    // Update speed randomly
    vehicle.speed = Math.floor(Math.random() * 30) + 15; // 15-45 mph
    
    // Occasionally update location name
    if (Math.random() < 0.1) { // 10% chance
      vehicle.location = generateRandomLocation();
    }
    
    // Update ETA
    const minutes = Math.floor(Math.random() * 60) + 10;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    vehicle.eta = `${hours > 0 ? hours + 'h ' : ''}${mins}m`;
  }
}

function generateRandomEvent() {
  const eventTypes = ['accident', 'construction', 'heavy_traffic'];
  const severities = ['low', 'medium', 'high'];
  const locations = [
    "Highway 101", "Downtown District", "Industrial Zone", 
    "City Center", "Main Street", "Business District"
  ];
  
  const event = {
    id: `T${Date.now()}`,
    type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    duration: Math.floor(Math.random() * 60) + 15
  };
  
  trafficEvents.push(event);
  addActivity(`Traffic event: ${event.type} at ${event.location}`, "Traffic System");
  addAlert(`${event.type.replace('_', ' ')} reported at ${event.location}`, "warning");
  
  // Affect nearby vehicles
  vehicles.forEach(vehicle => {
    if (vehicle.status === 'active' && Math.random() < 0.3) { // 30% chance to be affected
      if (event.severity === 'high') {
        vehicle.status = 'warning';
        vehicle.speed = Math.max(5, vehicle.speed - 20);
        addActivity(`${vehicle.vehicle_id} affected by ${event.type}`, vehicle.driver);
      }
    }
  });
  
  // Remove event after duration
  setTimeout(() => {
    trafficEvents = trafficEvents.filter(e => e.id !== event.id);
    addActivity(`Traffic event resolved at ${event.location}`, "Traffic System");
  }, event.duration * 1000);
}

// Simulation loop
function runSimulation() {
  if (!simulationState.isRunning || simulationState.isPaused) return;
  
  vehicles.forEach(vehicle => {
    updateVehiclePosition(vehicle);
    
    // Random status changes for active vehicles
    if (vehicle.status === 'active' && Math.random() < 0.05) { // 5% chance
      const newStatus = Math.random() < 0.8 ? 'active' : 'warning';
      if (newStatus !== vehicle.status) {
        vehicle.status = newStatus;
        addActivity(`${vehicle.vehicle_id} status changed to ${newStatus}`, vehicle.driver);
      }
    }
  });
}

// Start simulation
function startSimulation() {
  if (simulationState.isRunning) return;
  
  simulationState.isRunning = true;
  simulationState.isPaused = false;
  
  // Activate all vehicles
  vehicles.forEach(vehicle => {
    if (vehicle.status === 'idle') {
      vehicle.status = 'active';
      vehicle.location = generateRandomLocation();
      vehicle.next_stop = generateRandomLocation();
      const coords = generateRandomCoordinates();
      vehicle.lat = coords.lat;
      vehicle.lon = coords.lon;
      vehicle.speed = Math.floor(Math.random() * 30) + 15;
    }
  });
  
  // Start simulation intervals
  simulationInterval = setInterval(runSimulation, 2000); // Update every 2 seconds
  eventGenerationInterval = setInterval(() => {
    if (Math.random() < 0.3) { // 30% chance every 10 seconds
      generateRandomEvent();
    }
  }, 10000);
  
  addActivity("Fleet simulation started", "System");
  addAlert("Fleet simulation started - Live tracking active", "info");
}

function pauseSimulation() {
  simulationState.isPaused = true;
  addActivity("Fleet simulation paused", "System");
}

function stopSimulation() {
  simulationState.isRunning = false;
  simulationState.isPaused = false;
  
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  if (eventGenerationInterval) {
    clearInterval(eventGenerationInterval);
    eventGenerationInterval = null;
  }
  
  // Reset all vehicles to depot
  vehicles.forEach(vehicle => {
    vehicle.status = 'idle';
    vehicle.location = 'Depot';
    vehicle.speed = 0;
    vehicle.next_stop = 'Awaiting Assignment';
    vehicle.eta = '--';
    // Reset to depot coordinates with slight variation
    const depotCoords = generateRandomCoordinates(37.7749, -122.4194, 0.01);
    vehicle.lat = depotCoords.lat;
    vehicle.lon = depotCoords.lon;
  });
  
  // Clear events
  trafficEvents = [];
  
  addActivity("Fleet simulation stopped - All vehicles returned to depot", "System");
  addAlert("Simulation stopped", "info");
}

// API Routes

// Get all vehicles
app.get('/vehicles', (req, res) => {
  res.json(vehicles);
});

// Add a new vehicle
app.post('/vehicles', (req, res) => {
  const { vehicle_id, driver, location = "Depot", next_stop = "Awaiting Assignment", packages = 0, eta = "--" } = req.body;
  
  if (!vehicle_id || !driver) {
    return res.status(400).json({ error: 'Vehicle ID and driver are required' });
  }
  
  // Check if vehicle already exists
  if (vehicles.find(v => v.vehicle_id === vehicle_id)) {
    return res.status(400).json({ error: 'Vehicle ID already exists' });
  }
  
  const coords = generateRandomCoordinates();
  const newVehicle = {
    vehicle_id,
    driver,
    status: "idle",
    location,
    lat: coords.lat,
    lon: coords.lon,
    speed: 0,
    next_stop,
    packages,
    eta
  };
  
  vehicles.push(newVehicle);
  addActivity(`New vehicle ${vehicle_id} added to fleet`, driver);
  
  res.status(201).json(newVehicle);
});

// Simulation controls
app.post('/simulate/start', (req, res) => {
  startSimulation();
  res.json({ success: true, message: "Simulation started successfully" });
});

app.post('/simulate/pause', (req, res) => {
  pauseSimulation();
  res.json({ success: true, message: "Simulation paused successfully" });
});

app.post('/simulate/stop', (req, res) => {
  stopSimulation();
  res.json({ success: true, message: "Simulation stopped successfully" });
});

// Get simulation status
app.get('/simulate/status', (req, res) => {
  res.json(simulationState);
});

// Get dashboard stats
app.get('/dashboard/stats', (req, res) => {
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const totalPackages = vehicles.reduce((sum, v) => sum + (v.packages || 0), 0);
  
  res.json({
    activeVehicles,
    totalVehicles: vehicles.length,
    deliveriesToday: Math.floor(Math.random() * 50) + 20,
    completedDeliveries: Math.floor(Math.random() * 30) + 10,
    avgDeliveryTime: Math.floor(Math.random() * 30) + 15,
    coveragePercentage: Math.floor(Math.random() * 20) + 75,
    totalPackages
  });
});

// Get alerts
app.get('/alerts', (req, res) => {
  res.json(alerts);
});

// Get recent activity
app.get('/activity/recent', (req, res) => {
  res.json(activityLog.slice(0, 10));
});

// Get traffic events
app.get('/traffic-events', (req, res) => {
  res.json(trafficEvents);
});

// Update vehicle status
app.put('/vehicles/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const vehicle = vehicles.find(v => v.vehicle_id === id);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  
  vehicle.status = status;
  addActivity(`${id} status updated to ${status}`, vehicle.driver);
  
  res.json({ success: true, message: `Vehicle ${id} status updated to ${status}` });
});

// Assign route to vehicle
app.post('/vehicles/:id/route', (req, res) => {
  const { id } = req.params;
  const { route } = req.body;
  
  const vehicle = vehicles.find(v => v.vehicle_id === id);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  
  vehicle.next_stop = route || "New destination";
  addActivity(`Route assigned to ${id}`, vehicle.driver);
  
  res.json({ success: true, message: `Route assigned to ${id}` });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚛 Fleet Tracking Server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}`);
  console.log(`🎯 Simplified for real-time vehicle tracking`);
});
