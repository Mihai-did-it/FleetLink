# FleetLink Backend API

A Node.js/Express backend for the FleetLink fleet management system.

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Or start in production mode
npm start
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Vehicles
- `GET /vehicles` - Get all vehicles
- `POST /vehicles` - Add new vehicle
- `PATCH /vehicles/:id/status` - Update vehicle status
- `POST /vehicles/:id/route` - Assign route to vehicle

### Drivers
- `GET /drivers` - Get all drivers
- `POST /drivers` - Add new driver

### Traffic Events
- `GET /traffic-events` - Get all traffic events
- `POST /traffic-events` - Create traffic event
- `DELETE /traffic-events/:id` - Remove traffic event

### Simulation
- `POST /simulate/start` - Start simulation
- `POST /simulate/pause` - Pause simulation
- `POST /simulate/stop` - Stop simulation

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /alerts` - Get active alerts
- `GET /activity/recent` - Get recent activity

### Health Check
- `GET /health` - API health status

## Environment Variables

- `PORT` - Server port (default: 8000)

## Data Storage

Currently uses in-memory storage for development. In production, replace with a proper database like PostgreSQL, MongoDB, or AWS DynamoDB.
