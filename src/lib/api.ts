export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Local Storage Keys
const VEHICLES_STORAGE_KEY = 'fleetlink_vehicles';
const PACKAGES_STORAGE_KEY = 'fleetlink_packages';

export type Package = {
  id: string;
  destination: {
    address: string;
    lat: number;
    lng: number;
  };
  priority: "low" | "medium" | "high";
  status: "pending" | "in_transit" | "delivered";
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  recipientName?: string;
  packageType?: string;
  vehicleId?: string; // Add vehicle assignment
};

export type Vehicle = {
  vehicle_id: string;
  driver?: string;
  status?: "active"|"warning"|"danger"|"idle";
  lat?: number; lon?: number; speed?: number;
  next_stop?: string; packages?: Package[]; eta?: string;
  location?: string;
  route?: {
    waypoints: Array<{
      id: string;
      address: string;
      lat: number;
      lng: number;
      estimatedArrival?: string;
      isCompleted?: boolean;
    }>;
    totalDistance?: number;
    totalDuration?: number;
  };
};

// Local Storage Utilities
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage for key ${key}:`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage for key ${key}:`, error);
  }
}

// Initialize default data if not exists
function initializeDefaultData() {
  const existingVehicles = getFromStorage<Vehicle[]>(VEHICLES_STORAGE_KEY, []);
  const existingPackages = getFromStorage<Package[]>(PACKAGES_STORAGE_KEY, []);
  
  if (existingVehicles.length === 0) {
    const defaultVehicles: Vehicle[] = [
      {
        vehicle_id: "TRUCK-001",
        driver: "Mike Johnson",
        status: "active",
        location: "Downtown District",
        lat: 37.7749,
        lon: -122.4194,
        speed: 35,
        next_stop: "Westfield Mall",
        packages: [],
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
        packages: [],
        eta: "3:15 PM"
      }
    ];
    saveToStorage(VEHICLES_STORAGE_KEY, defaultVehicles);
  }
  
  if (existingPackages.length === 0) {
    const defaultPackages: Package[] = [
      {
        id: "PKG-001",
        destination: {
          address: "123 Main St, Downtown",
          lat: 37.7849,
          lng: -122.4094
        },
        priority: "high",
        status: "pending",
        estimatedDeliveryTime: "2:45 PM",
        recipientName: "John Doe",
        packageType: "Electronics"
      },
      {
        id: "PKG-002",
        destination: {
          address: "456 Oak Ave, Midtown", 
          lat: 37.7749,
          lng: -122.4194
        },
        priority: "medium",
        status: "pending",
        estimatedDeliveryTime: "3:15 PM",
        recipientName: "Jane Smith",
        packageType: "Clothing"
      }
    ];
    saveToStorage(PACKAGES_STORAGE_KEY, defaultPackages);
  }
}

// Initialize on import
initializeDefaultData();

export type Driver = {
  id: string;
  name: string;
  vehicleType: string;
  status: "available" | "assigned" | "active";
};

export type TrafficEvent = {
  id: string;
  type: "accident" | "construction" | "heavy_traffic";
  location: string;
  severity: "low" | "medium" | "high";
  duration: number;
};

// Packages API
export async function getPackages(): Promise<Package[]> {
  // Always use local storage first
  const localPackages = getFromStorage<Package[]>(PACKAGES_STORAGE_KEY, []);
  return localPackages;
}

export async function addPackage(packageData: Omit<Package, 'id'>): Promise<Package> {
  const packages = getFromStorage<Package[]>(PACKAGES_STORAGE_KEY, []);
  const newPackage: Package = {
    id: `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...packageData
  };
  
  packages.push(newPackage);
  saveToStorage(PACKAGES_STORAGE_KEY, packages);
  
  // Also update the vehicle's packages if assigned
  if (newPackage.vehicleId) {
    await assignPackageToVehicle(newPackage.id, newPackage.vehicleId);
  }
  
  return newPackage;
}

export async function assignPackageToVehicle(packageId: string, vehicleId: string) {
  const packages = getFromStorage<Package[]>(PACKAGES_STORAGE_KEY, []);
  const vehicles = getFromStorage<Vehicle[]>(VEHICLES_STORAGE_KEY, []);
  
  // Update package assignment
  const packageIndex = packages.findIndex(p => p.id === packageId);
  if (packageIndex >= 0) {
    packages[packageIndex].vehicleId = vehicleId;
    saveToStorage(PACKAGES_STORAGE_KEY, packages);
  }
  
  // Update vehicle packages
  const vehicleIndex = vehicles.findIndex(v => v.vehicle_id === vehicleId);
  if (vehicleIndex >= 0) {
    const vehiclePackages = packages.filter(p => p.vehicleId === vehicleId);
    vehicles[vehicleIndex].packages = vehiclePackages;
    saveToStorage(VEHICLES_STORAGE_KEY, vehicles);
  }
  
  return { success: true };
}

export async function updatePackageStatus(packageId: string, status: Package['status']) {
  const packages = getFromStorage<Package[]>(PACKAGES_STORAGE_KEY, []);
  const packageIndex = packages.findIndex(p => p.id === packageId);
  
  if (packageIndex >= 0) {
    packages[packageIndex].status = status;
    if (status === 'delivered') {
      packages[packageIndex].actualDeliveryTime = new Date().toLocaleTimeString();
    }
    saveToStorage(PACKAGES_STORAGE_KEY, packages);
  }
  
  return { success: true };
}

// Vehicle API
export async function getVehicles(): Promise<Vehicle[]> {
  const vehicles = getFromStorage<Vehicle[]>(VEHICLES_STORAGE_KEY, []);
  const packages = getFromStorage<Package[]>(PACKAGES_STORAGE_KEY, []);
  
  // Sync packages with vehicles
  return vehicles.map(vehicle => ({
    ...vehicle,
    packages: packages.filter(p => p.vehicleId === vehicle.vehicle_id)
  }));
}

export async function addVehicle(payload: Partial<Vehicle> & {vehicle_id: string}): Promise<Vehicle> {
  const vehicles = getFromStorage<Vehicle[]>(VEHICLES_STORAGE_KEY, []);
  
  // Check if vehicle already exists
  const existingIndex = vehicles.findIndex(v => v.vehicle_id === payload.vehicle_id);
  if (existingIndex >= 0) {
    throw new Error(`Vehicle with ID ${payload.vehicle_id} already exists`);
  }
  
  const newVehicle: Vehicle = {
    vehicle_id: payload.vehicle_id,
    driver: payload.driver || "Unknown Driver",
    status: payload.status || "idle",
    lat: payload.lat || 37.7749,
    lon: payload.lon || -122.4194,
    speed: payload.speed || 0,
    location: payload.location || "Unknown Location",
    packages: [],
    eta: payload.eta || "--",
    next_stop: payload.next_stop || "Awaiting Assignment"
  };
  
  vehicles.push(newVehicle);
  saveToStorage(VEHICLES_STORAGE_KEY, vehicles);
  
  return newVehicle;
}

export async function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const vehicles = getFromStorage<Vehicle[]>(VEHICLES_STORAGE_KEY, []);
  const vehicleIndex = vehicles.findIndex(v => v.vehicle_id === vehicleId);
  
  if (vehicleIndex < 0) {
    throw new Error(`Vehicle with ID ${vehicleId} not found`);
  }
  
  vehicles[vehicleIndex] = { ...vehicles[vehicleIndex], ...updates };
  saveToStorage(VEHICLES_STORAGE_KEY, vehicles);
  
  return vehicles[vehicleIndex];
}

export async function removeVehicle(vehicleId: string): Promise<void> {
  const vehicles = getFromStorage<Vehicle[]>(VEHICLES_STORAGE_KEY, []);
  const packages = getFromStorage<Package[]>(PACKAGES_STORAGE_KEY, []);
  
  // Remove vehicle
  const filteredVehicles = vehicles.filter(v => v.vehicle_id !== vehicleId);
  saveToStorage(VEHICLES_STORAGE_KEY, filteredVehicles);
  
  // Unassign packages from this vehicle
  const updatedPackages = packages.map(p => 
    p.vehicleId === vehicleId ? { ...p, vehicleId: undefined } : p
  );
  saveToStorage(PACKAGES_STORAGE_KEY, updatedPackages);
}

// Simulation API (local mock responses)
export async function startSimulation() {
  console.log("Simulation started (local mode)");
  return { success: true, message: "Simulation started" };
}

export async function pauseSimulation() {
  console.log("Simulation paused (local mode)");
  return { success: true, message: "Simulation paused" };
}

export async function stopSimulation() {
  console.log("Simulation stopped (local mode)");
  return { success: true, message: "Simulation stopped" };
}

// Driver API (local mock responses)
export async function getDrivers(): Promise<Driver[]> {
  return [
    { id: "D001", name: "Mike Johnson", vehicleType: "Truck", status: "available" },
    { id: "D002", name: "Sarah Chen", vehicleType: "Van", status: "active" },
    { id: "D003", name: "David Rodriguez", vehicleType: "Truck", status: "available" },
    { id: "D004", name: "Emma Wilson", vehicleType: "Van", status: "available" },
  ];
}

export async function addDriver(driver: Omit<Driver, 'id'>): Promise<Driver> {
  return {
    id: `D${Date.now()}`,
    ...driver
  };
}

// Traffic Events API (local mock responses)
export async function getTrafficEvents(): Promise<TrafficEvent[]> {
  return [
    {
      id: "T001",
      type: "heavy_traffic",
      location: "Highway 101 North",
      severity: "medium",
      duration: 45
    }
  ];
}

export async function addTrafficEvent(event: Omit<TrafficEvent, 'id'>): Promise<TrafficEvent> {
  return {
    id: `T${Date.now()}`,
    ...event
  };
}

export async function removeTrafficEvent(id: string): Promise<void> {
  console.log(`Removing traffic event ${id} (local mode)`);
}

// Dashboard Stats API (calculated from local data)
export async function getDashboardStats() {
  const vehicles = await getVehicles();
  const packages = await getPackages();
  
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const totalVehicles = vehicles.length;
  const totalPackages = packages.length;
  const completedDeliveries = packages.filter(p => p.status === 'delivered').length;
  const inTransitPackages = packages.filter(p => p.status === 'in_transit').length;
  
  return {
    activeVehicles,
    totalVehicles,
    deliveriesToday: totalPackages,
    completedDeliveries,
    inTransitDeliveries: inTransitPackages,
    avgDeliveryTime: 24,
    coveragePercentage: Math.min(100, (activeVehicles / Math.max(1, totalVehicles)) * 100)
  };
}

// Alerts API (local mock responses)
export async function getAlerts() {
  const vehicles = await getVehicles();
  const alerts = [];
  
  // Generate dynamic alerts based on vehicle status
  vehicles.forEach(vehicle => {
    if (vehicle.status === 'warning') {
      alerts.push({
        id: Date.now() + Math.random(),
        message: `${vehicle.vehicle_id} experiencing delays`,
        type: "warning",
        time: "2 min ago"
      });
    }
  });
  
  // Add some static alerts
  alerts.push(
    { id: 2, message: "New delivery request - Priority", type: "info", time: "5 min ago" },
    { id: 3, message: "Route optimization complete", type: "success", time: "8 min ago" }
  );
  
  return alerts;
}

// Activity API (local mock responses)
export async function getRecentActivity() {
  const vehicles = await getVehicles();
  const packages = await getPackages();
  
  const activity = [];
  
  // Generate dynamic activity based on current data
  vehicles.slice(0, 3).forEach((vehicle, index) => {
    activity.push({
      id: index + 1,
      action: `Route assigned to ${vehicle.vehicle_id}`,
      driver: vehicle.driver || "Unknown Driver",
      time: `${(index + 1) * 2} min ago`
    });
  });
  
  return activity;
}

// Vehicle Actions API (using local storage)
export async function updateVehicleStatus(vehicleId: string, status: Vehicle['status']) {
  const vehicles = getFromStorage<Vehicle[]>(VEHICLES_STORAGE_KEY, []);
  const vehicleIndex = vehicles.findIndex(v => v.vehicle_id === vehicleId);
  
  if (vehicleIndex >= 0) {
    vehicles[vehicleIndex].status = status;
    saveToStorage(VEHICLES_STORAGE_KEY, vehicles);
  }
  
  return { success: true };
}

export async function assignRoute(vehicleId: string, route: string) {
  console.log(`Assigning route to ${vehicleId}: ${route} (local mode)`);
  return { success: true };
}
