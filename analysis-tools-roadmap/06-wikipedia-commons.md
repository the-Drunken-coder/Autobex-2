# Wikipedia Commons

**Status:** Approved  
**Priority:** Medium  
**Complexity:** Medium

## Overview

Search and display Wikimedia Commons photos related to the location, along with related Wikipedia articles.

## Features

- Search Wikimedia Commons for photos of the location
- Display available photos from Commons
- Link to related Wikipedia articles
- Show photo metadata (date, photographer, license)

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **Wikimedia Commons API**
   - Use Wikimedia Commons API: `https://commons.wikimedia.org/w/api.php`
   - Search by coordinates: `action=query&list=geosearch&gsradius=1000&gscoord=${lat}|${lon}`
   - Search by location name/tags
   - Fetch image URLs and metadata

2. **Wikipedia articles**
   - Search for nearby Wikipedia articles using geosearch
   - Link to articles that mention the location

3. **Return data structure**
   ```javascript
   {
     commons: {
       photos: [
         { url: "...", thumbnail: "...", title: "...", author: "...", license: "...", date: "..." },
         ...
       ],
       count: 5
     },
     wikipedia: [
       { title: "...", url: "...", distance: 0.1 }
     ]
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add "Wikipedia Commons" section
   - Photo gallery with thumbnails
   - Click to view full-size images
   - Show photo metadata (author, license, date)
   - Links to Wikipedia articles

2. **Photo gallery**
   - Grid layout for thumbnails
   - Lightbox/modal for full-size viewing
   - Respect image licenses

### APIs/Services

- **Wikimedia Commons API** - Free, no API key required
- **Wikipedia API** - Free, for article search
- **Geosearch API** - Part of Wikimedia API

## Notes

- Wikimedia APIs are free and well-documented
- Some locations may not have Commons photos
- Need to respect image licenses (most Commons images are free use)
- Photo quality and relevance may vary
- Plans may change based on API response format
- May need to handle pagination for locations with many photos

