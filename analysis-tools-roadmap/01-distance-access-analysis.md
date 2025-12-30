# Distance & Access Analysis

**Status:** Approved  
**Priority:** Medium  
**Complexity:** Medium

## Overview

Calculate distances to nearest parking lots and road access points, identify access routes, and provide navigation directions.

## Features

- Calculate distance to nearest parking lot
- Calculate distance to nearest road access
- Identify access points and routes
- Show walking/driving directions from current location

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **Query nearby parking lots and roads**
   - Use Overpass API to find `amenity=parking` within radius (e.g., 2km)
   - Query `highway=*` for nearby roads
   - Calculate distances using Haversine formula or similar

2. **Distance calculation**
   - Calculate straight-line distance from location to nearest parking
   - Calculate straight-line distance to nearest road
   - Optionally calculate walking distance using routing API (if available)

3. **Return data structure**
   ```javascript
   {
     nearestParking: { distance: 0.5, lat: ..., lon: ..., name: ... },
     nearestRoad: { distance: 0.2, lat: ..., lon: ..., name: ... },
     accessPoints: [...]
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add new "Access & Distance" section in analyze results
   - Show distances with icons
   - Display parking/road names if available

2. **Map integration** (optional)
   - Show markers for nearest parking and roads
   - Draw lines showing distances
   - Link to Google Maps directions

### APIs/Services

- **Overpass API** - Query OSM for parking and roads
- **Google Maps Directions API** (optional) - For walking/driving directions
- **OpenRouteService** (free alternative) - For routing

## Notes

- Plans may change based on API availability
- Distance calculations can be simple straight-line or more complex routing
- May need to handle cases where no parking/roads found nearby
- Consider caching results for performance

