# Vegetation Overgrowth Detection

**Status:** Approved  
**Priority:** Low  
**Complexity:** Very High

## Overview

Analyze satellite imagery to detect vegetation growth over time, indicating abandonment duration.

## Features

- Analyze satellite imagery for vegetation growth
- Compare vegetation coverage over time
- Indicator of abandonment duration
- Visual overlay showing overgrowth areas

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **Image analysis** (Complex)
   - Fetch satellite imagery for different time periods
   - Use image processing to detect vegetation
   - **NDVI (Normalized Difference Vegetation Index)** - Standard vegetation detection
   - Compare NDVI values over time
   - Calculate vegetation coverage percentage

2. **Services/Libraries**
   - **Google Earth Engine** - Has built-in NDVI analysis
   - **Planet Labs API** - Satellite imagery with analysis tools
   - **Custom image processing** - Use libraries like Sharp, Canvas, or server-side processing
   - **Third-party APIs** - Some services offer vegetation analysis

3. **Return data structure**
   ```javascript
   {
     vegetation: {
       current: { coverage: 0.65, ndvi: 0.4 },
       historical: [
         { date: "2010", coverage: 0.2, ndvi: 0.1 },
         { date: "2015", coverage: 0.4, ndvi: 0.25 }
       ],
       growthRate: 0.05, // per year
       estimatedAbandonment: "2010"
     }
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add "Vegetation Analysis" section
   - Show vegetation coverage over time (chart/graph)
   - Visual overlay on map showing vegetation areas
   - Estimated abandonment date

2. **Visualization**
   - Line chart showing vegetation growth over time
   - Map overlay with vegetation highlighted
   - Color-coded areas (green = vegetation)

### APIs/Services

- **Google Earth Engine** - Has NDVI analysis capabilities
- **Planet Labs API** - Satellite imagery and analysis
- **USGS Landsat** - Free satellite imagery with NDVI data
- **Custom processing** - May need server-side image processing

## Notes

- This is a very complex feature requiring image processing
- NDVI calculation requires specific satellite bands (red, near-infrared)
- May need specialized libraries or services
- Processing may be slow for large areas
- Plans may change significantly - this might be too complex for MVP
- Consider using third-party services that do this analysis
- May need to cache processed results
- Accuracy depends on imagery quality and availability
- This feature might be better suited for a future version or separate tool

