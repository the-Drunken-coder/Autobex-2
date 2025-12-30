# Analysis Tools Roadmap

This folder contains implementation plans for approved analysis tool features for the AutoBex 2 Analyze tool.

## 📋 Overview

Each feature has its own markdown file with a rough implementation plan. These plans are **flexible and subject to change** based on:
- API availability and limitations
- Technical feasibility discoveries
- User feedback
- Development priorities
- Resource constraints

## ✅ Approved Features

1. **[Distance & Access Analysis](./01-distance-access-analysis.md)** - Calculate distances to parking/roads and show access routes
2. **[OSM Edit History](./02-osm-edit-history.md)** - Fetch and display OpenStreetMap edit history
3. **[Historical Aerial Imagery](./03-historical-aerial-imagery.md)** - Link to and compare historical satellite imagery
4. **[News & Media Archives](./04-news-media-archives.md)** - Search news articles and historical archives
5. **[Street-Level Imagery](./05-street-level-imagery.md)** - Google Street View, Mapillary, and KartaView integration
6. **[Wikipedia Commons](./06-wikipedia-commons.md)** - Search and display Wikimedia Commons photos
7. **[Related Media Search](./07-related-media-search.md)** - Search Flickr, Instagram, YouTube, Reddit, and forums
8. **[Satellite Comparison](./08-satellite-comparison.md)** - Side-by-side historical vs current imagery comparison
9. **[Vegetation Overgrowth Detection](./09-vegetation-overgrowth.md)** - Analyze vegetation growth over time

## 🎯 Implementation Priority

These can be implemented incrementally. Suggested order:
1. Simple integrations (Street View, Wikipedia Commons)
2. Distance calculations (Distance & Access Analysis)
3. External API integrations (Media Search, News Archives)
4. Complex analysis (OSM History, Satellite Comparison, Vegetation Detection)

## 📝 Notes

- **Plans are rough and flexible** - Implementation details may change during development
- Each feature file includes rough technical approach, but actual implementation may differ
- Features can be modified, combined, or split as needed
- Some features may require external API keys or services

