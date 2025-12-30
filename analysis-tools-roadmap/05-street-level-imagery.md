# Street-Level Imagery

**Status:** Approved  
**Priority:** High  
**Complexity:** Low-Medium

## Overview

Integrate Google Street View, Mapillary, and KartaView to show street-level imagery of locations.

## Features

- Embed Google Street View if available
- Link to Mapillary/KartaView crowdsourced street imagery
- Show most recent street-level imagery date
- Multiple imagery provider options

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **Check availability**
   - **Google Street View**: Use Street View Static API or check availability
   - **Mapillary**: Use Mapillary API to find nearby imagery
   - **KartaView**: Use KartaView API (if available)

2. **Generate links/embeds**
   - Create Street View embed URLs: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`
   - Generate Mapillary viewer links
   - Check if imagery exists at coordinates

3. **Return data structure**
   ```javascript
   {
     streetView: {
       google: { available: true, url: "...", date: "..." },
       mapillary: { available: true, url: "...", date: "..." },
       kartaview: { available: false }
     }
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add "Street-Level Imagery" section
   - Embed Google Street View iframe (if available)
   - Links to Mapillary/KartaView viewers
   - Show imagery dates

2. **Embed implementation**
   - Use Google Street View Embed API
   - Responsive iframe for Street View
   - Fallback to links if embedding not possible

### APIs/Services

- **Google Street View Static API** - Requires API key (free tier available)
- **Google Street View Embed API** - Free, no API key needed for embeds
- **Mapillary API** - Free, may require API key for some features
- **KartaView API** - Check availability

## Notes

- Google Street View Embed API is free and doesn't require API key
- Mapillary has good coverage in many areas
- Some locations may not have street-level imagery available
- Embed vs link depends on service policies
- Plans may change based on API availability
- Street View availability check may require API call or can be assumed

