# OSM Edit History

**Status:** Added ✅  
**Priority:** Medium  
**Complexity:** High

## Overview

Fetch and display OpenStreetMap edit history, showing when elements were created, modified, and when abandonment tags were added.

## Features

- Fetch OSM edit history (when was it first mapped, last edited?)
- Show when "abandoned" tag was added
- Display edit timeline and contributors
- Link to OSM history viewer

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **OSM History API**
   - Use OSM API endpoint: `https://www.openstreetmap.org/api/0.6/[node|way|relation]/[id]/history`
   - Parse XML response to extract versions, timestamps, contributors
   - Track when specific tags (like "abandoned") were added

2. **Process history data**
   - Extract version numbers, timestamps, usernames
   - Identify tag changes (especially abandonment-related tags)
   - Calculate time since first mapping, last edit

3. **Return data structure**
   ```javascript
   {
     history: [
       { version: 1, timestamp: "...", user: "...", tags: {...} },
       ...
     ],
     firstMapped: "...",
     lastEdited: "...",
     abandonedTagAdded: "...",
     contributors: [...]
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add "Edit History" section
   - Timeline visualization (simple list or visual timeline)
   - Show version numbers, dates, contributors
   - Highlight when abandonment tags were added

2. **Links**
   - Link to OSM history viewer: `https://www.openstreetmap.org/[type]/[id]/history`

### APIs/Services

- **OSM API v0.6** - `/history` endpoint (XML format)
- May need XML parsing library or convert to JSON

## Notes

- OSM API returns XML, may need conversion
- History can be large for frequently edited elements
- Consider pagination or limiting to recent edits
- Some elements may not have history (very old or deleted)
- Plans may change based on API response format

