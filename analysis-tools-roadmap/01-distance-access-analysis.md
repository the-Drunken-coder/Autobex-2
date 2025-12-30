# Distance & Access Analysis

**Status:** Added ✅  
**Priority:** Medium  
**Complexity:** Medium

## Overview

Calculate distances to nearest parking lots and road access points, and identify access points.

## Features

- Calculate distance to nearest parking lot
- Calculate distance to nearest road access
- Identify access points

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **Query nearby parking lots and roads**
   - Use Overpass API to find `amenity=parking` within radius (e.g., 2km)
   - Query `highway=*` for nearby roads
   - Calculate distances using Haversine formula or similar

2. **Distance calculation**
   - Calculate straight-line distance from location to nearest parking
   - Calculate straight-line distance to nearest road

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

### APIs/Services

- **Overpass API** - Query OSM for parking and roads

## Notes

- Plans may change based on API availability
- Distance calculations use straight-line (Haversine formula)
- May need to handle cases where no parking/roads found nearby
- Consider caching results for performance

