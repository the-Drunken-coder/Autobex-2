# News & Media Archives

**Status:** Approved  
**Priority:** Medium  
**Complexity:** Medium-High

## Overview

Search historical newspaper archives and general news articles for mentions of the location.

## Features

- Search historical newspaper archives for mentions
- Search general news articles about the location
- Find news stories related to the place
- Link to relevant news sources

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **News search APIs**
   - **Google News API** - Search by location coordinates or name
   - **NewsAPI** - General news search (may require API key)
   - **Chronicling America** (Library of Congress) - Historical newspapers (free)
   - **Newspapers.com** - May require subscription/API
   - **Archive.org** - Historical news archives

2. **Search strategy**
   - Use location name + coordinates
   - Search for address if available
   - Search for nearby landmarks
   - Filter by relevance/date

3. **Return data structure**
   ```javascript
   {
     news: [
       { title: "...", source: "...", date: "...", url: "...", snippet: "..." },
       ...
     ],
     historical: [
       { title: "...", source: "...", date: "...", url: "..." },
       ...
     ]
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add "News & Media" section
   - List of news articles with titles, sources, dates
   - Clickable links to full articles
   - Separate sections for current news vs historical archives

2. **UI elements**
   - Article cards with preview snippets
   - Date sorting/filtering
   - Source badges

### APIs/Services

- **Google News RSS/API** - Free but limited
- **NewsAPI** - Requires API key, has free tier
- **Chronicling America API** - Free historical newspapers
- **Archive.org API** - Free historical archives
- **Newspapers.com** - May require subscription

## Notes

- Many news APIs require API keys
- Some services may have rate limits
- Historical archives may have limited coverage
- Search quality depends on location name/address availability
- Plans may change based on API availability and costs
- May need to combine multiple sources for best results

