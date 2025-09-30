# 🚀 FleetLink Setup Guide - Supabase Backend

## 📋 **Step-by-Step Setup Instructions**

### **Step 1: Create Supabase Project**

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up/Login** to your account
3. **Create a new project:**
   - Click "New Project"
   - Enter project name: `fleetlink-backend`
   - Set a strong database password
   - Choose a region close to you
   - Wait for project setup (2-3 minutes)

### **Step 2: Set Up Database Tables**

1. **Go to SQL Editor** in your Supabase dashboard
2. **Copy and paste** the entire content from `supabase-schema.sql`
3. **Click "Run"** to create all tables and sample data

The schema includes:
- ✅ `vehicles` table - stores vehicle information
- ✅ `packages` table - stores package/delivery information  
- ✅ `delivery_routes` table - stores optimized routes
- ✅ Sample data for testing
- ✅ Real-time subscriptions enabled
- ✅ Row Level Security policies

### **Step 3: Get Your API Keys**

1. **Go to Settings → API** in your Supabase dashboard
2. **Copy these two values:**
   - **Project URL** (looks like: `https://abcd1234.supabase.co`)
   - **Project API Keys → anon/public** (starts with `eyJhbGci...`)

### **Step 4: Configure Environment Variables**

1. **Create a `.env` file** in your project root:
   ```bash
   # Copy .env.example to .env
   cp .env.example .env
   ```

2. **Edit `.env` file** with your Supabase credentials:
   ```bash
   # Mapbox Configuration (already set)
   VITE_MAPBOX_TOKEN=pk.eyJ1IjoibW5pZmFpIiwiYSI6ImNtZjM5dng3dzAxZWYybHEwdmZ2MmE4MDkifQ.CGxxP82dHH4tu6V9D6FhHg

   # Supabase Configuration - REPLACE WITH YOUR VALUES
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### **Step 5: Test the Application**

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser** to `http://localhost:5173`

3. **Test the functionality:**
   - ✅ Should see "Supabase Connected" in the top bar
   - ✅ Try adding a vehicle using "Add Vehicle" section
   - ✅ Try adding packages to vehicles
   - ✅ Generate routes using "Routing" section
   - ✅ Start simulation to see vehicles move

---

## 🎯 **What's Working Now**

### ✅ **Add Vehicle Functionality**
- Real address geocoding with Mapbox
- Saves to Supabase database
- Vehicle appears on map instantly
- Auto-refresh with real-time subscriptions

### ✅ **Add Package Functionality**  
- Assign packages to specific vehicles
- Geocode delivery addresses automatically
- Set priority levels and package details
- Real-time updates across the app

### ✅ **Route Generation**
- Uses Mapbox Directions API for real road routes
- Optimizes delivery order automatically
- Shows colored route lines on map
- Numbered checkpoints for each delivery
- Saves routes to database

### ✅ **Simulation System**
- Start/stop simulation controls
- Updates vehicle status to "active"
- Changes packages to "in-transit" 
- Real-time status updates

### ✅ **Real-time Updates**
- Changes sync instantly across all views
- Vehicle markers update automatically
- Route information refreshes live
- Package status changes propagate

---

## 🛠 **Technical Features**

### **Database Structure:**
- **PostgreSQL** with real-time subscriptions
- **Row Level Security** for data protection
- **Automatic timestamps** and triggers
- **Foreign key relationships** between tables

### **API Integration:**
- **Mapbox Directions API** for route calculation
- **Mapbox Geocoding API** for address lookup
- **Supabase Real-time** for live updates
- **TypeScript** interfaces for type safety

### **Map Features:**
- **Interactive vehicle markers** with popups
- **Route visualization** with colored lines
- **Delivery checkpoints** with package info
- **Real-time position updates**

---

## 🚨 **Troubleshooting**

### **"Disconnected" Status**
1. Check your `.env` file has correct Supabase credentials
2. Verify your Supabase project is running
3. Check browser console for error messages

### **Can't Add Vehicles/Packages**
1. Ensure Supabase tables are created (run the SQL schema)
2. Check RLS policies are enabled
3. Verify your API keys have correct permissions

### **Routes Not Showing**
1. Make sure Mapbox token is valid
2. Check if vehicles have packages assigned
3. Click "Optimize All Routes" button
4. Ensure "Routes ON" is activated

### **Geocoding Failures**
1. Try more specific addresses (include city, state)
2. Check Mapbox geocoding API limits
3. Verify address format is correct

---

## 📊 **Usage Limits & Monitoring**

### **Mapbox Limits:**
- **Free Tier:** 50,000 requests/month for Directions API
- **Monitor usage:** Check your Mapbox dashboard
- **Upgrade:** If you exceed limits

### **Supabase Limits:**
- **Free Tier:** 500MB database, 50MB file storage
- **Real-time:** 200 concurrent connections
- **Monitor usage:** Check your Supabase dashboard

---

## 🎯 **Next Steps**

### **Immediate Testing:**
1. Add 2-3 vehicles in different locations
2. Add 3-4 packages to each vehicle  
3. Generate routes and see them on the map
4. Start simulation and watch status updates

### **Advanced Features to Add:**
- **Driver mobile app** for delivery updates
- **Customer notifications** for delivery tracking
- **Historical route analysis** and optimization
- **Traffic-aware routing** with real-time data
- **Delivery time windows** and constraints

---

## 💡 **Tips for Success**

1. **Start with sample data** - Use the provided sample vehicles/packages
2. **Test incrementally** - Add one vehicle at a time initially
3. **Monitor the console** - Watch for errors and success messages
4. **Use realistic addresses** - Full addresses work better than just city names
5. **Check real-time updates** - Open multiple browser tabs to see live sync

Your FleetLink system is now ready with a robust Supabase backend! 🎉

The add functionality works, routes generate automatically, and the simulation system is fully operational.