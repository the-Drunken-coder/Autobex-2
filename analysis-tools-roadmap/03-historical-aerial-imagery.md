# Historical Aerial Imagery

**Status:** Added ✅  
**Priority:** High  
**Complexity:** High

## Overview

Link to and compare historical aerial imagery from various sources, showing how locations have changed over time.

## Features

- Link to historical aerial imagery (USGS, Google Earth timelapse)
- Show imagery from different time periods
- Compare historical vs current satellite imagery side-by-side
- Identify when structures were built/demolished

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **Generate imagery links**
   - **USGS EarthExplorer**: Generate links to USGS historical imagery (may require API or manual links)
   - **Google Earth Timelapse**: Generate embed/link URLs
   - **Esri Wayback**: Use Esri's historical imagery service
   - **Bing Maps**: Check if historical imagery available

2. **Return data structure**
   ```javascript
   {
     imagery: {
       current: { provider: "...", url: "...", date: "..." },
       historical: [
         { provider: "USGS", url: "...", date: "..." },
         { provider: "Google", url: "...", date: "..." }
       ]
     }
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add "Historical Imagery" section
   - Show links to different imagery sources
   - Embed or link to imagery viewers
   - Side-by-side comparison view (if possible)

2. **Comparison view** (if implementing embedded comparison)
   - Use iframe embeds or image overlays
   - Time slider for selecting different dates
   - Split-screen view for comparison

### APIs/Services

- **USGS EarthExplorer** - May require API key or manual link generation
- **Google Earth Timelapse** - Public URLs available
- **Esri Wayback Imagery** - Free historical imagery service
- **Google Maps Time Machine** - If available
- **Bing Maps** - Historical imagery (if available)

## Notes

- Many services may require API keys or have usage limits
- Some imagery may not be available for all locations
- Embedding vs linking depends on service policies
- Comparison view may be complex to implement
- Plans may change significantly based on available services and APIs
- May need to use third-party services or libraries for comparison

