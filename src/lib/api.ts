export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type Vehicle = {
  vehicle_id: string;
  driver?: string;
  status?: "active"|"warning"|"danger"|"idle";
  lat?: number; lon?: number; speed?: number;
  next_stop?: string; packages?: number; eta?: string;
};

export async function getVehicles(): Promise<Vehicle[]> {
  const r = await fetch(`${API_BASE}/vehicles`);
  if (!r.ok) throw new Error("Failed to load vehicles");
  return r.json();
}

export async function addVehicle(payload: Partial<Vehicle> & {vehicle_id: string}) {
  const r = await fetch(`${API_BASE}/vehicles`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to add vehicle");
  return r.json();
}

export async function startSimulation() {
  const r = await fetch(`${API_BASE}/simulate/start`, { method: "POST" });
  if (!r.ok) throw new Error("Failed to start simulation");
  return r.json();
}

export async function stopSimulation() {
  const r = await fetch(`${API_BASE}/simulate/stop`, { method: "POST" });
  if (!r.ok) throw new Error("Failed to stop simulation");
  return r.json();
}
