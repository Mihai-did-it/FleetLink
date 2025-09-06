export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type Vehicle = {
  vehicle_id: string;
  driver?: string;
  status?: "active"|"warning"|"danger"|"idle";
  lat?: number; lon?: number; speed?: number;
  next_stop?: string; packages?: number; eta?: string;
  location?: string;
};

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

// Vehicle API
export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const r = await fetch(`${API_BASE}/vehicles`);
    if (!r.ok) throw new Error("Failed to load vehicles");
    return r.json();
  } catch (error) {
    console.warn("Using mock data - backend not available");
    // Return mock data as fallback
    return [
      {
        vehicle_id: "TRUCK-001",
        driver: "Mike Johnson",
        status: "active",
        location: "Downtown District",
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
        speed: 0,
        next_stop: "Awaiting Assignment",
        packages: 0,
        eta: "--"
      }
    ];
  }
}

export async function addVehicle(payload: Partial<Vehicle> & {vehicle_id: string}) {
  try {
    const r = await fetch(`${API_BASE}/vehicles`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error("Failed to add vehicle");
    return r.json();
  } catch (error) {
    console.warn("Using mock response - backend not available");
    return payload;
  }
}

// Simulation API
export async function startSimulation() {
  try {
    const r = await fetch(`${API_BASE}/simulate/start`, { method: "POST" });
    if (!r.ok) throw new Error("Failed to start simulation");
    return r.json();
  } catch (error) {
    console.warn("Using mock response - backend not available");
    return { success: true, message: "Simulation started" };
  }
}

export async function pauseSimulation() {
  try {
    const r = await fetch(`${API_BASE}/simulate/pause`, { method: "POST" });
    if (!r.ok) throw new Error("Failed to pause simulation");
    return r.json();
  } catch (error) {
    console.warn("Using mock response - backend not available");
    return { success: true, message: "Simulation paused" };
  }
}

export async function stopSimulation() {
  try {
    const r = await fetch(`${API_BASE}/simulate/stop`, { method: "POST" });
    if (!r.ok) throw new Error("Failed to stop simulation");
    return r.json();
  } catch (error) {
    console.warn("Using mock response - backend not available");
    return { success: true, message: "Simulation stopped" };
  }
}

// Driver API
export async function getDrivers(): Promise<Driver[]> {
  try {
    const r = await fetch(`${API_BASE}/drivers`);
    if (!r.ok) throw new Error("Failed to load drivers");
    return r.json();
  } catch (error) {
    console.warn("Using mock data - backend not available");
    return [
      { id: "D001", name: "Mike Johnson", vehicleType: "Truck", status: "available" },
      { id: "D002", name: "Sarah Chen", vehicleType: "Van", status: "active" },
    ];
  }
}

export async function addDriver(driver: Omit<Driver, 'id'>): Promise<Driver> {
  try {
    const r = await fetch(`${API_BASE}/drivers`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(driver),
    });
    if (!r.ok) throw new Error("Failed to add driver");
    return r.json();
  } catch (error) {
    console.warn("Using mock response - backend not available");
    return {
      id: `D${Date.now()}`,
      ...driver
    };
  }
}

// Traffic Events API
export async function getTrafficEvents(): Promise<TrafficEvent[]> {
  try {
    const r = await fetch(`${API_BASE}/traffic-events`);
    if (!r.ok) throw new Error("Failed to load traffic events");
    return r.json();
  } catch (error) {
    console.warn("Using mock data - backend not available");
    return [];
  }
}

export async function addTrafficEvent(event: Omit<TrafficEvent, 'id'>): Promise<TrafficEvent> {
  try {
    const r = await fetch(`${API_BASE}/traffic-events`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(event),
    });
    if (!r.ok) throw new Error("Failed to add traffic event");
    return r.json();
  } catch (error) {
    console.warn("Using mock response - backend not available");
    return {
      id: `T${Date.now()}`,
      ...event
    };
  }
}

export async function removeTrafficEvent(id: string): Promise<void> {
  try {
    const r = await fetch(`${API_BASE}/traffic-events/${id}`, {
      method: "DELETE",
    });
    if (!r.ok) throw new Error("Failed to remove traffic event");
  } catch (error) {
    console.warn("Using mock response - backend not available");
  }
}

// Dashboard Stats API
export async function getDashboardStats() {
  try {
    const r = await fetch(`${API_BASE}/dashboard/stats`);
    if (!r.ok) throw new Error("Failed to load dashboard stats");
    return r.json();
  } catch (error) {
    console.warn("Using mock data - backend not available");
    return {
      activeVehicles: 8,
      totalVehicles: 10,
      deliveriesToday: 47,
      completedDeliveries: 12,
      avgDeliveryTime: 24,
      coveragePercentage: 85
    };
  }
}

// Alerts API
export async function getAlerts() {
  try {
    const r = await fetch(`${API_BASE}/alerts`);
    if (!r.ok) throw new Error("Failed to load alerts");
    return r.json();
  } catch (error) {
    console.warn("Using mock data - backend not available");
    return [
      { id: 1, message: "TRUCK-003 experiencing traffic delays", type: "warning", time: "2 min ago" },
      { id: 2, message: "New delivery request - Priority", type: "info", time: "5 min ago" },
      { id: 3, message: "TRUCK-001 completed delivery", type: "success", time: "8 min ago" }
    ];
  }
}

// Activity API  
export async function getRecentActivity() {
  try {
    const r = await fetch(`${API_BASE}/activity/recent`);
    if (!r.ok) throw new Error("Failed to load recent activity");
    return r.json();
  } catch (error) {
    console.warn("Using mock data - backend not available");
    return [
      { id: 1, action: "Route assigned to TRUCK-002", driver: "Sarah Chen", time: "1 min ago" },
      { id: 2, action: "Delivery completed", driver: "Mike Johnson", time: "5 min ago" },
      { id: 3, action: "Vehicle maintenance reminder", driver: "David Rodriguez", time: "12 min ago" },
    ];
  }
}

// Vehicle Actions API
export async function updateVehicleStatus(vehicleId: string, status: Vehicle['status']) {
  try {
    const r = await fetch(`${API_BASE}/vehicles/${vehicleId}/status`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ status }),
    });
    if (!r.ok) throw new Error("Failed to update vehicle status");
    return r.json();
  } catch (error) {
    console.warn("Using mock response - backend not available");
    return { success: true };
  }
}

export async function assignRoute(vehicleId: string, route: string) {
  try {
    const r = await fetch(`${API_BASE}/vehicles/${vehicleId}/route`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ route }),
    });
    if (!r.ok) throw new Error("Failed to assign route");
    return r.json();
  } catch (error) {
    console.warn("Using mock response - backend not available");
    return { success: true };
  }
}
