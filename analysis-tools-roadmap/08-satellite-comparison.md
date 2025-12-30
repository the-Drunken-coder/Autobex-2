# Satellite Comparison

**Status:** Approved  
**Priority:** Medium  
**Complexity:** High

## Overview

Compare historical vs current satellite imagery side-by-side, showing changes over time.

## Features

- Side-by-side historical vs current satellite imagery
- Show imagery from multiple providers (Google, Bing, Esri)
- Time slider for comparing different dates
- Highlight changes over time

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **Historical imagery sources**
   - **Esri Wayback Imagery** - Free historical imagery service
   - **Google Earth Engine** - Requires API key, complex
   - **USGS EarthExplorer** - Historical imagery (may need API)
   - **Bing Maps** - Check historical imagery availability

2. **Get imagery URLs**
   - Generate tile URLs for different time periods
   - Or use imagery services that provide historical layers
   - Store available dates for each location

3. **Return data structure**
   ```javascript
   {
     satelliteComparison: {
       current: { provider: "...", url: "...", date: "..." },
       historical: [
         { provider: "...", url: "...", date: "...", year: 2010 },
         { provider: "...", url: "...", date: "...", year: 2000 }
       ],
       availableDates: [...]
     }
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add "Satellite Comparison" section
   - Side-by-side image comparison view
   - Time slider/selector for choosing dates
   - Provider selector (Google, Bing, Esri)

2. **Comparison view**
   - Split-screen with two map views
   - Or overlay slider (before/after slider)
   - Synchronized zoom/pan
   - Date labels

3. **Map integration**
   - Use Leaflet with multiple tile layers
   - Switch between historical layers
   - Or use image comparison libraries

### APIs/Services

- **Esri Wayback Imagery** - Free historical imagery
- **Google Earth Engine** - Complex, requires API key
- **USGS EarthExplorer** - Historical imagery
- **Bing Maps** - Historical imagery (if available)
- **Google Maps Time Machine** - If available

## Notes

- Esri Wayback is probably the easiest free option
- Google Earth Engine is powerful but complex
- May need to use tile services or image overlays
- Comparison UI can be complex to implement
- Plans may change significantly based on available services
- Some locations may not have historical imagery available
- Consider using third-party comparison libraries
- May need to handle different coordinate systems/projections

