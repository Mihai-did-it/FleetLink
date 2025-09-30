-- FleetLink Database Schema for Supabase
-- Run these SQL commands in your Supabase SQL Editor

-- ==================== VEHICLES TABLE ====================
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id VARCHAR(50) UNIQUE NOT NULL,
  driver VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('active', 'idle', 'warning', 'on-time', 'delayed')),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  speed INTEGER DEFAULT 0,
  location TEXT NOT NULL,
  next_stop TEXT,
  eta TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies for vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (you can make this more restrictive)
CREATE POLICY "Allow all operations on vehicles" ON vehicles 
FOR ALL USING (true);

-- ==================== PACKAGES TABLE ====================
CREATE TABLE packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id VARCHAR(50) UNIQUE NOT NULL,
  vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  weight DECIMAL(8, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-transit', 'delivered')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  recipient_name VARCHAR(100),
  package_type VARCHAR(50),
  estimated_delivery_time TEXT,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for packages
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on packages" ON packages 
FOR ALL USING (true);

-- ==================== DELIVERY ROUTES TABLE ====================
CREATE TABLE delivery_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  route_geometry JSONB NOT NULL, -- GeoJSON geometry
  total_distance INTEGER NOT NULL, -- in meters
  total_duration INTEGER NOT NULL, -- in seconds
  waypoints JSONB NOT NULL, -- Array of waypoint objects
  is_optimized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for delivery routes
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on delivery_routes" ON delivery_routes 
FOR ALL USING (true);

-- ==================== INDEXES ====================
-- Create indexes for better performance
CREATE INDEX idx_vehicles_vehicle_id ON vehicles(vehicle_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_packages_vehicle_id ON packages(vehicle_id);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_delivery_routes_vehicle_id ON delivery_routes(vehicle_id);

-- ==================== UPDATED_AT TRIGGERS ====================
-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_routes_updated_at BEFORE UPDATE ON delivery_routes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== REALTIME SUBSCRIPTIONS ====================
-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE packages;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_routes;

-- ==================== SAMPLE DATA (OPTIONAL) ====================
-- Insert some sample vehicles for testing
INSERT INTO vehicles (vehicle_id, driver, lat, lng, location, status) VALUES
('TRUCK-001', 'Mike Johnson', 37.7749, -122.4194, 'San Francisco Downtown', 'idle'),
('TRUCK-002', 'Sarah Chen', 37.7849, -122.4094, 'San Francisco Mission', 'idle'),
('VAN-001', 'David Rodriguez', 37.7649, -122.4294, 'San Francisco SOMA', 'idle');

-- Insert some sample packages for testing
INSERT INTO packages (package_id, vehicle_id, destination, destination_lat, destination_lng, weight, priority, recipient_name, package_type) VALUES
('PKG-001', 'TRUCK-001', '123 Market St, San Francisco', 37.7879, -122.3972, 5.5, 'high', 'John Doe', 'Electronics'),
('PKG-002', 'TRUCK-001', '456 Mission St, San Francisco', 37.7879, -122.3972, 2.3, 'medium', 'Jane Smith', 'Documents'),
('PKG-003', 'TRUCK-002', '789 Howard St, San Francisco', 37.7869, -122.3962, 8.1, 'low', 'Bob Wilson', 'Clothing');

-- ==================== FUNCTIONS ====================
-- Function to get vehicle with packages
CREATE OR REPLACE FUNCTION get_vehicle_with_packages(vehicle_id_param VARCHAR)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'vehicle', row_to_json(v.*),
    'packages', COALESCE(array_to_json(array_agg(row_to_json(p.*))), '[]'::json)
  )
  INTO result
  FROM vehicles v
  LEFT JOIN packages p ON v.vehicle_id = p.vehicle_id
  WHERE v.vehicle_id = vehicle_id_param
  GROUP BY v.id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;