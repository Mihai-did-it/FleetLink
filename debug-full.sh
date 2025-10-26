#!/bin/bash

echo "🔍 Full Debug Test - Location Search & Route Generation"
echo "======================================================"

# Test 1: Check MapBox token
echo "📍 1. Checking MapBox token..."
node -e "
const token = process.env.VITE_MAPBOX_TOKEN;
if (!token) {
  console.log('❌ VITE_MAPBOX_TOKEN not set in environment');
  process.exit(1);
}
console.log('Token available:', !!token);
console.log('Token length:', token.length);
console.log('Token starts with pk.:', token.startsWith('pk.'));
"

# Test 2: Test MapBox Geocoding API
echo
echo "🌍 2. Testing MapBox Geocoding API..."
node -e "
const token = process.env.VITE_MAPBOX_TOKEN;
if (!token) {
  console.log('❌ VITE_MAPBOX_TOKEN not set');
  process.exit(1);
}
const query = 'Times Square New York';
const url = \`https://api.mapbox.com/geocoding/v5/mapbox.places/\${encodeURIComponent(query)}.json?access_token=\${token}&limit=5&types=place,locality,neighborhood,address\`;

fetch(url)
  .then(response => {
    console.log('API Response Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Features found:', data.features?.length || 0);
    if (data.features && data.features.length > 0) {
      console.log('First result:', data.features[0].place_name);
      console.log('Coordinates:', data.features[0].center);
    }
    if (data.message) {
      console.log('Error message:', data.message);
    }
  })
  .catch(error => {
    console.error('API Error:', error.message);
  });
"

# Test 3: Test MapBox Directions API
echo
echo "🛣️ 3. Testing MapBox Directions API..."
node -e "
const token = process.env.VITE_MAPBOX_TOKEN;
if (!token) {
  console.log('❌ VITE_MAPBOX_TOKEN not set');
  process.exit(1);
}
const start = '-73.9857,40.7484'; // Times Square
const end = '-73.9442,40.8176';   // Columbia University
const url = \`https://api.mapbox.com/directions/v5/mapbox/driving/\${start};\${end}?access_token=\${token}&overview=full&geometries=geojson\`;

fetch(url)
  .then(response => {
    console.log('Directions API Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Routes found:', data.routes?.length || 0);
    if (data.routes && data.routes.length > 0) {
      console.log('Route distance:', data.routes[0].distance, 'meters');
      console.log('Route duration:', data.routes[0].duration, 'seconds');
      console.log('Has geometry:', !!data.routes[0].geometry);
    }
    if (data.message) {
      console.log('Error message:', data.message);
    }
  })
  .catch(error => {
    console.error('Directions API Error:', error.message);
  });
"

echo
echo "✅ Debug tests completed!"
echo "Now open http://localhost:8081 and check browser console for any errors."