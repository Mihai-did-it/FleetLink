const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data store (replace with database in production)
let vehicles = [
  {
    vehicle_id: "TRUCK-001",
    driver: "Mike Johnson",
    status: "active",
    location: "Downtown District",
    lat: 37.7749,
    lon: -122.4194,
    speed: 35,
    next_stop: "Westfield Mall",
    packages: 8,
    eta: "2:45 PM"
  },
  {
    vehicle_id: "TRUCK-002",
    driver: "Sarah Chen",
    status: "active",
    location: "Industrial Zone",
    lat: 37.7849,
    lon: -122.4094,
    speed: 28,
    next_stop: "Tech Campus",
    packages: 12,
    eta: "3:15 PM"
  },
  {
    vehicle_id: "TRUCK-003",
    driver: "David Rodriguez",
    status: "warning",
    location: "Highway 101",
    lat: 37.7649,
    lon: -122.4294,
    speed: 15,
    next_stop: "City Center",
    packages: 6,
    eta: "4:20 PM"
  },
  {
    vehicle_id: "TRUCK-004",
    driver: "Emma Wilson",
    status: "idle",
    location: "Depot",
    lat: 37.7549,
    lon: -122.4394,
    speed: 0,
    next_stop: "Awaiting Assignment",
    packages: 0,
    eta: "--"
  }
];

let drivers = [
  { id: "D001", name: "Mike Johnson", vehicleType: "Truck", status: "active" },
  { id: "D002", name: "Sarah Chen", vehicleType: "Van", status: "active" },
  { id: "D003", name: "David Rodriguez", vehicleType: "Truck", status: "active" },
  { id: "D004", name: "Emma Wilson", vehicleType: "Truck", status: "available" },
];

let trafficEvents = [
  {
    id: "T001",
    type: "construction",
    location: "Highway 101",
    severity: "medium",
    duration: 45
  }
];

let alerts = [
  { id: 1, message: "TRUCK-003 experiencing traffic delays", type: "warning", time: "2 min ago" },
  { id: 2, message: "New delivery request - Priority", type: "info", time: "5 min ago" },
  { id: 3, message: "TRUCK-001 completed delivery", type: "success", time: "8 min ago" }
];

let recentActivity = [
  { id: 1, action: "Route assigned to TRUCK-002", driver: "Sarah Chen", time: "1 min ago" },
  { id: 2, action: "Delivery completed", driver: "Mike Johnson", time: "5 min ago" },
  { id: 3, action: "Vehicle maintenance reminder", driver: "David Rodriguez", time: "12 min ago" },
];

let simulationRunning = false;

// Helper function to add timestamp to activity
const addActivity = (action, driver) => {
  const newActivity = {
    id: recentActivity.length + 1,
    action,
    driver: driver || "System",
    time: "Just now"
  };
  recentActivity.unshift(newActivity);
  if (recentActivity.length > 10) {
    recentActivity = recentActivity.slice(0, 10);
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'FleetLink API is running' });
});

// Vehicle endpoints
app.get('/vehicles', (req, res) => {
  res.json(vehicles);
});

app.post('/vehicles', (req, res) => {
  const newVehicle = {
    vehicle_id: req.body.vehicle_id || `TRUCK-${String(vehicles.length + 1).padStart(3, '0')}`,
    driver: req.body.driver,
    status: req.body.status || "idle",
    location: req.body.location,
    lat: req.body.lat || (37.7749 + Math.random() * 0.1),
    lon: req.body.lon || (-122.4194 + Math.random() * 0.1),
    speed: req.body.speed || 0,
    next_stop: req.body.next_stop || "Awaiting Assignment",
    packages: req.body.packages || 0,
    eta: req.body.eta || "--"
  };
  
  vehicles.push(newVehicle);
  addActivity(`New vehicle ${newVehicle.vehicle_id} added to fleet`, req.body.driver);
  
  res.status(201).json(newVehicle);
});

app.patch('/vehicles/:id/status', (req, res) => {
  const vehicleId = req.params.id;
  const { status } = req.body;
  
  const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  
  const oldStatus = vehicle.status;
  vehicle.status = status;
  
  addActivity(`Vehicle ${vehicleId} status changed from ${oldStatus} to ${status}`, vehicle.driver);
  
  res.json({ success: true, vehicle });
});

app.post('/vehicles/:id/route', (req, res) => {
  const vehicleId = req.params.id;
  const { route } = req.body;
  
  const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  
  // Update vehicle with new route info
  vehicle.next_stop = route || "New destination assigned";
  vehicle.status = "active";
  
  addActivity(`Route assigned to ${vehicleId}`, vehicle.driver);
  
  res.json({ success: true, message: `Route assigned to ${vehicleId}` });
});

// Driver endpoints
app.get('/drivers', (req, res) => {
  res.json(drivers);
});

app.post('/drivers', (req, res) => {
  const newDriver = {
    id: `D${String(drivers.length + 1).padStart(3, '0')}`,
    name: req.body.name,
    vehicleType: req.body.vehicleType,
    status: req.body.status || "available"
  };
  
  drivers.push(newDriver);
  addActivity(`New driver ${newDriver.name} added to fleet`, newDriver.name);
  
  res.status(201).json(newDriver);
});

// Traffic Events endpoints
app.get('/traffic-events', (req, res) => {
  res.json(trafficEvents);
});

app.post('/traffic-events', (req, res) => {
  const newEvent = {
    id: `T${Date.now()}`,
    type: req.body.type,
    location: req.body.location,
    severity: req.body.severity,
    duration: req.body.duration
  };
  
  trafficEvents.push(newEvent);
  addActivity(`Traffic event reported: ${newEvent.type} at ${newEvent.location}`, "Traffic System");
  
  // Add alert for traffic event
  const alertMessage = `${newEvent.type.replace('_', ' ')} reported at ${newEvent.location}`;
  alerts.unshift({
    id: alerts.length + 1,
    message: alertMessage,
    type: "warning",
    time: "Just now"
  });
  
  res.status(201).json(newEvent);
});

app.delete('/traffic-events/:id', (req, res) => {
  const eventId = req.params.id;
  const eventIndex = trafficEvents.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    return res.status(404).json({ error: 'Traffic event not found' });
  }
  
  const removedEvent = trafficEvents[eventIndex];
  trafficEvents.splice(eventIndex, 1);
  
  addActivity(`Traffic event resolved: ${removedEvent.type} at ${removedEvent.location}`, "Traffic System");
  
  res.json({ success: true, message: 'Traffic event removed' });
});

// Simulation endpoints
app.post('/simulate/start', (req, res) => {
  simulationRunning = true;
  addActivity("Fleet simulation started", "System");
  
  // Add alert for simulation start
  alerts.unshift({
    id: alerts.length + 1,
    message: "Fleet simulation started - Live tracking active",
    type: "info",
    time: "Just now"
  });
  
  res.json({ success: true, message: "Simulation started successfully" });
});

app.post('/simulate/pause', (req, res) => {
  simulationRunning = false;
  addActivity("Fleet simulation paused", "System");
  
  res.json({ success: true, message: "Simulation paused successfully" });
});

app.post('/simulate/stop', (req, res) => {
  simulationRunning = false;
  addActivity("Fleet simulation stopped and reset", "System");
  
  // Reset all vehicles to idle when simulation stops
  vehicles.forEach(vehicle => {
    if (vehicle.status === "active") {
      vehicle.status = "idle";
      vehicle.speed = 0;
    }
  });
  
  res.json({ success: true, message: "Simulation stopped and reset successfully" });
});

// Dashboard endpoints
app.get('/dashboard/stats', (req, res) => {
  const activeVehicles = vehicles.filter(v => v.status === "active").length;
  const totalVehicles = vehicles.length;
  const completedDeliveries = Math.floor(Math.random() * 20) + 10; // Simulated
  const deliveriesToday = completedDeliveries + Math.floor(Math.random() * 30) + 20;
  const avgDeliveryTime = Math.floor(Math.random() * 10) + 20; // 20-30 minutes
  const coveragePercentage = Math.floor(Math.random() * 20) + 75; // 75-95%
  
  res.json({
    activeVehicles,
    totalVehicles,
    deliveriesToday,
    completedDeliveries,
    avgDeliveryTime,
    coveragePercentage
  });
});

app.get('/alerts', (req, res) => {
  res.json(alerts);
});

app.get('/activity/recent', (req, res) => {
  res.json(recentActivity);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚛 FleetLink Backend API running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API Endpoints available:`);
  console.log(`   - GET    /vehicles`);
  console.log(`   - POST   /vehicles`);
  console.log(`   - GET    /drivers`);
  console.log(`   - POST   /drivers`);
  console.log(`   - GET    /traffic-events`);
  console.log(`   - POST   /simulate/start`);
  console.log(`   - GET    /dashboard/stats`);
  console.log(`   - GET    /alerts`);
  console.log(`   - GET    /activity/recent`);
});

module.exports = app;
