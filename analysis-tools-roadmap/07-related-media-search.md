# Related Media Search

**Status:** Approved  
**Priority:** High  
**Complexity:** Medium-High

## Overview

Search multiple platforms (Flickr, Instagram, YouTube, Reddit, forums) for media and content related to the location.

## Features

- **Flickr**: Search Flickr by geo-coordinates
- **Instagram**: Find Instagram posts at/about location
- **YouTube**: Search YouTube for videos at/about location
- **Reddit**: Reddit location-based search
- **Urban Exploration Forums**: Search urban exploration forum mentions

## Rough Implementation Plan

### Backend (`functions/api/analyze.js`)

1. **Flickr API**
   - Use Flickr API: `flickr.photos.search` with `lat`, `lon`, `radius`
   - Requires API key (free tier available)
   - Return photo URLs, titles, dates, photographers

2. **Instagram** (Limited)
   - Instagram Graph API requires business account
   - May need to use location name search instead
   - Or link to Instagram location pages
   - Consider web scraping (with legal considerations)

3. **YouTube API**
   - Use YouTube Data API v3
   - Search by location name + coordinates
   - Requires API key (free tier available)
   - Return video IDs, titles, thumbnails, dates

4. **Reddit**
   - Use Reddit JSON API (no auth needed for read)
   - Search subreddits: `r/urbanexploration`, `r/abandoned`, etc.
   - Search by location name/keywords
   - Return post titles, URLs, dates

5. **Urban Exploration Forums**
   - May require web scraping (check ToS)
   - Or use RSS feeds if available
   - Search by location name/coordinates

6. **Return data structure**
   ```javascript
   {
     media: {
       flickr: [...],
       instagram: [...],
       youtube: [...],
       reddit: [...],
       forums: [...]
     }
   }
   ```

### Frontend (`public/app.js`)

1. **Display section**
   - Add "Related Media" section with tabs or sections
   - Each platform in its own subsection
   - Show thumbnails, titles, dates
   - Links to original content

2. **UI elements**
   - Platform tabs or accordion sections
   - Media grids/galleries
   - Video embeds for YouTube
   - Respect platform ToS and attribution

### APIs/Services

- **Flickr API** - Requires API key (free)
- **Instagram Graph API** - Requires business account (limited)
- **YouTube Data API** - Requires API key (free tier)
- **Reddit JSON API** - Free, no auth needed
- **Forum APIs** - Varies by forum

## Notes

- Most APIs require API keys (usually free tier available)
- Instagram access is very limited without business account
- Reddit API is free and easy to use
- Forum scraping may violate ToS - check before implementing
- Rate limits may apply to all APIs
- Plans may change significantly based on API availability and ToS
- Some platforms may not allow certain types of searches
- Consider caching results to reduce API calls

