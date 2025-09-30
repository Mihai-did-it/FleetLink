// Mapbox Directions API service
export interface RouteWaypoint {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  address: string;
  packageId?: string;
  estimatedTime?: string;
  isDelivered?: boolean;
}

export interface DeliveryRoute {
  vehicleId: string;
  startLocation: RouteWaypoint;
  waypoints: RouteWaypoint[];
  destination: RouteWaypoint;
  routeGeometry?: any;
  duration?: number; // in seconds
  distance?: number; // in meters
}

export interface MapboxDirectionsResponse {
  routes: Array<{
    geometry: any;
    duration: number;
    distance: number;
    legs: Array<{
      duration: number;
      distance: number;
      steps: Array<{
        geometry: any;
        duration: number;
        distance: number;
        instruction: string;
      }>;
    }>;
  }>;
  waypoints: Array<{
    location: [number, number];
    name: string;
  }>;
}

/**
 * Get optimized route with multiple waypoints using Mapbox Directions API
 */
export async function getOptimizedRoute(
  coordinates: [number, number][],
  mapboxToken: string
): Promise<MapboxDirectionsResponse> {
  console.log('🚀 getOptimizedRoute called with coordinates:', coordinates)
  
  if (coordinates.length < 2) {
    throw new Error('At least 2 coordinates required for routing');
  }

  if (coordinates.length > 25) {
    throw new Error('Maximum 25 waypoints allowed');
  }

  // Validate coordinates
  for (let i = 0; i < coordinates.length; i++) {
    const [lng, lat] = coordinates[i];
    if (typeof lng !== 'number' || typeof lat !== 'number' || 
        isNaN(lng) || isNaN(lat) ||
        lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      console.error('❌ Invalid coordinate at index', i, ':', coordinates[i]);
      throw new Error(`Invalid coordinate at index ${i}: [${lng}, ${lat}]`);
    }
  }

  // Remove duplicate coordinates that are too close (within ~100 meters)
  const filteredCoordinates = [coordinates[0]]; // Always keep the first coordinate
  for (let i = 1; i < coordinates.length; i++) {
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = filteredCoordinates[filteredCoordinates.length - 1];
    
    // Calculate approximate distance (simplified)
    const deltaLng = Math.abs(lng1 - lng2);
    const deltaLat = Math.abs(lat1 - lat2);
    const distance = Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);
    
    // Only include if distance is > 0.001 degrees (~111 meters)
    if (distance > 0.001) {
      filteredCoordinates.push(coordinates[i]);
    } else {
      console.log('⚠️ Skipping coordinate too close to previous:', coordinates[i], `distance: ${(distance * 111000).toFixed(0)}m`);
    }
  }

  console.log('🌐 Filtered coordinates:', filteredCoordinates);

  // If we filtered out too many coordinates, return an error
  if (filteredCoordinates.length < 2) {
    throw new Error('Not enough distinct coordinates for routing - destinations are too close together (within 111 meters)');
  }

  // For routes with close waypoints, don't use optimization to avoid 422 errors
  const useOptimization = filteredCoordinates.length > 2 && filteredCoordinates.length <= 10;

  // Format coordinates for Mapbox API (lng,lat;lng,lat;...)
  const coordinatesString = filteredCoordinates
    .map(coord => `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`)
    .join(';');

  console.log('🌐 MapBox API coordinates string:', coordinatesString);

  // Build Mapbox Directions API URL
  const profile = 'driving'; // driving, walking, cycling, driving-traffic
  const params = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    continue_straight: 'false', // Allow U-turns for better routing
    access_token: mapboxToken
  });

  // NEVER use optimization for 3+ waypoints if there are close coordinates
  const hasCloseCoordinates = coordinates.length !== filteredCoordinates.length;
  if (useOptimization && !hasCloseCoordinates) {
    params.append('optimize', 'true');
    console.log('🔄 Using route optimization for', filteredCoordinates.length, 'waypoints');
  } else {
    console.log('⚠️ Skipping optimization for', filteredCoordinates.length, 'waypoints', hasCloseCoordinates ? '(has close coordinates)' : '');
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}?${params}`;
  console.log('🌐 MapBox API URL:', url);

  try {
    console.log('📡 Making request to MapBox Directions API...');
    const response = await fetch(url);
    
    console.log('📡 MapBox API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ MapBox API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        coordinates: coordinatesString
      });
      
      // Return a more descriptive error for 422 errors
      if (response.status === 422) {
        throw new Error(`Mapbox API error: Invalid route parameters. This might be due to coordinates being too close together or other routing constraints.`);
      }
      
      throw new Error(`Mapbox API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data: MapboxDirectionsResponse = await response.json();
    
    console.log('✅ MapBox API success:', {
      routesFound: data.routes?.length || 0,
      firstRouteDistance: data.routes?.[0]?.distance,
      firstRouteDuration: data.routes?.[0]?.duration,
      hasGeometry: !!data.routes?.[0]?.geometry
    });
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found');
    }

    return data;
  } catch (error) {
    console.error('❌ Routing error:', error);
    throw error;
  }
}

/**
 * Create a delivery route for a vehicle with multiple package destinations
 */
export async function createDeliveryRoute(
  vehicleId: string,
  startLocation: RouteWaypoint,
  packageDestinations: RouteWaypoint[],
  mapboxToken: string
): Promise<DeliveryRoute> {
  try {
    console.log(`🚀 Creating delivery route for vehicle ${vehicleId}`);
    console.log('📍 Start location:', startLocation);
    console.log('📦 Package destinations:', packageDestinations);

    // Combine start location with all package destinations
    const allCoordinates = [
      startLocation.coordinates,
      ...packageDestinations.map(dest => dest.coordinates)
    ];

    console.log('🗺️ All coordinates for routing:', allCoordinates);

    // Get optimized route from Mapbox
    console.log('🌐 Calling MapBox Directions API...');
    const routeData = await getOptimizedRoute(allCoordinates, mapboxToken);
    
    console.log('✅ MapBox response received:', {
      routesCount: routeData.routes?.length,
      hasRoute: !!routeData.routes?.[0],
      geometry: !!routeData.routes?.[0]?.geometry
    });
    
    const route = routeData.routes[0];
    
    if (!route) {
      throw new Error('No route returned from MapBox API');
    }

    const deliveryRoute = {
      vehicleId,
      startLocation,
      waypoints: packageDestinations,
      destination: packageDestinations[packageDestinations.length - 1],
      routeGeometry: route.geometry,
      duration: route.duration,
      distance: route.distance
    };

    console.log('✅ Delivery route created:', {
      vehicleId,
      distance: deliveryRoute.distance,
      duration: deliveryRoute.duration,
      waypointCount: packageDestinations.length,
      hasGeometry: !!deliveryRoute.routeGeometry
    });

    return deliveryRoute;
  } catch (error) {
    console.error(`❌ Failed to create delivery route for vehicle ${vehicleId}:`, error);
    throw error;
  }
}

/**
 * Generate mock package destinations for demonstration
 */
export function generateMockPackageDestinations(vehicleLocation: [number, number]): RouteWaypoint[] {
  const [baseLng, baseLat] = vehicleLocation;
  
  return [
    {
      id: 'pkg-001',
      coordinates: [baseLng + 0.01, baseLat + 0.005] as [number, number],
      address: '123 Main St, Downtown',
      packageId: 'PKG-001',
      estimatedTime: '15 min',
      isDelivered: false
    },
    {
      id: 'pkg-002', 
      coordinates: [baseLng + 0.02, baseLat - 0.01] as [number, number],
      address: '456 Oak Ave, Midtown',
      packageId: 'PKG-002',
      estimatedTime: '25 min',
      isDelivered: false
    },
    {
      id: 'pkg-003',
      coordinates: [baseLng - 0.015, baseLat + 0.02] as [number, number],
      address: '789 Pine Rd, Uptown',
      packageId: 'PKG-003',
      estimatedTime: '35 min',
      isDelivered: false
    },
    {
      id: 'pkg-004',
      coordinates: [baseLng + 0.005, baseLat - 0.025] as [number, number],
      address: '321 Elm Dr, Southside',
      packageId: 'PKG-004',
      estimatedTime: '45 min',
      isDelivered: false
    }
  ];
}

/**
 * Format duration from seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format distance from meters to human readable string
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}