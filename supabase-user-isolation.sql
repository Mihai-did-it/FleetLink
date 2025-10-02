-- Add user_id column to vehicles table
ALTER TABLE vehicles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to packages table  
ALTER TABLE packages ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to routes table
ALTER TABLE routes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing data to assign to first user (if any exists)
-- You can skip this if you want to start fresh
UPDATE vehicles SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE packages SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE routes SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Update Row Level Security policies to filter by user_id
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON vehicles;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON packages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON packages;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON packages;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON packages;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON routes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON routes;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON routes;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON routes;

-- Create new user-specific policies for vehicles
CREATE POLICY "Users can read own vehicles" ON vehicles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles" ON vehicles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" ON vehicles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" ON vehicles
FOR DELETE USING (auth.uid() = user_id);

-- Create new user-specific policies for packages
CREATE POLICY "Users can read own packages" ON packages
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packages" ON packages
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packages" ON packages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own packages" ON packages
FOR DELETE USING (auth.uid() = user_id);

-- Create new user-specific policies for routes
CREATE POLICY "Users can read own routes" ON routes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routes" ON routes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes" ON routes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes" ON routes
FOR DELETE USING (auth.uid() = user_id);