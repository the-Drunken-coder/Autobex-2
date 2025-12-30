# AutoBex 2

A web application that finds abandoned places by querying OpenStreetMap data. Search by city name, coordinates with radius, or custom polygon areas.

## Features

- **Three Search Methods:**
  - City/Place Names: Enter a city name and search within its boundaries
  - Coordinates + Radius: Specify a center point and search radius in kilometers (click on map to set center)
  - Polygon Coordinates: Define a custom search area with multiple coordinate points (click on map to add points)

- **Interactive Map:** 
  - View results on an interactive Leaflet map with markers for each abandoned place
  - Click on the map to set search coordinates (radius center or polygon points)
  - Live preview of search areas (radius circle or polygon outline) as you configure them
  - Multiple basemap options: OpenStreetMap, Google Maps Satellite, Bing Maps Satellite, Esri World Imagery
  - Marker clustering for better performance with many results
  - Custom markers with detailed popups showing place information and links to external maps

- **Comprehensive Filter System:** 
  - **Basic Status:** Abandoned, Disused
  - **Ruins:** ruins=yes, historic=ruins
  - **Railways:** railway=abandoned, railway=disused, disused:railway=station, abandoned:railway=station
  - **Buildings:** building:condition=ruinous, building=ruins
  - **Amenities:** disused:amenity=*, abandoned:amenity=*
  - **Shops:** disused:shop=*, abandoned:shop=*, shop=vacant
  - **Land Use:** landuse=brownfield
  - **Aeroways:** disused:aeroway=*, abandoned:aeroway=*
  - All filters are collapsible and can be toggled individually

- **Results Management:**
  - Group nearby places together (toggleable, 150m threshold)
  - Sort results by Name (A-Z/Z-A), Type, or Distance from map center (when grouping is disabled)
  - Collapsible groups for multiple places in the same area
  - Click on results to focus the map and open popup
  - Results sidebar can be collapsed/expanded for better map visibility
  - Grouping can be toggled on/off after search to reorganize results

- **User Interface:**
  - Modern dark theme with responsive design
  - Topbar navigation for easy access to tools
  - Collapsible sidebar for mobile-friendly experience
  - Real-time progress tracking with visual feedback
  - Interactive map controls with custom markers and popups

- **Progress Tracking:** Real-time progress indicator with step-by-step status updates during searches

- **Results Display:** Browse found places with details including name, type, address, and location tags. Each result includes links to Google Maps and Bing Maps.

## Project Structure

```
├── public/
│   ├── index.html          # Main HTML page
│   ├── app.js              # Frontend JavaScript logic
│   └── styles.css          # Styling
├── functions/
│   └── api/
│       └── search.js       # Cloudflare Pages Function for OSM queries
├── package.json            # Dependencies and scripts
├── wrangler.toml           # Cloudflare Pages configuration
├── start.py                # Python script to start dev server (checks prerequisites)
└── README.md               # This file
```

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Run locally:**

You can start the development server in two ways:

**Option A: Using Python script (recommended for Windows):**
```bash
python start.py
```
This script will automatically check for Node.js/npm, install dependencies if needed, and start the server.

**Option B: Using npm directly:**
```bash
npm run dev
```

The application will be available at `http://localhost:8788` (or the port shown in the terminal).

## Usage

### City Search
1. Select "City/Place Name" from the search type dropdown
2. Enter a city name (e.g., "New York, USA")
3. Click "Search"

### Coordinates + Radius Search
1. Select "Coordinates + Radius" from the search type dropdown
2. Either:
   - Click on the map to set the center point (coordinates will auto-fill)
   - Or manually enter Latitude (e.g., 40.7128) and Longitude (e.g., -74.0060)
3. Enter Radius in kilometers (e.g., 5) - a preview circle will appear on the map
4. Optionally adjust filters in the Filters section (collapsible)
5. Optionally toggle "Group nearby places" to group results within 150m
6. Click "Find Places"

**Tip:** The map cursor changes to a crosshair when radius search is selected. Click anywhere on the map to set the center point. As you type the radius value, a preview circle will appear on the map showing the search area.

### Polygon Search
1. Select "Custom Polygon" from the search type dropdown
2. Either:
   - Click on the map to add polygon points (coordinates will appear in the textarea)
   - Or manually enter coordinates, one per line, in the format `lat,lon`:
```
40.7128,-74.0060
40.7228,-74.0060
40.7228,-74.0160
40.7128,-74.0160
```
3. Use "Clear Points" button to reset if needed
4. Optionally adjust filters in the Filters section (collapsible)
5. Optionally toggle "Group nearby places" to group results within 150m
6. Click "Find Places"

**Note:** Polygons must have at least 3 coordinate points. The map will show a preview polygon with numbered markers as you add points. You can also manually edit coordinates in the textarea and the preview will update automatically.

## Deployment to Cloudflare Pages

1. **Install Wrangler CLI** (if not already installed):
```bash
npm install -g wrangler
```

2. **Login to Cloudflare:**
```bash
wrangler login
```

3. **Deploy:**
```bash
npm run deploy
```

Alternatively, connect your GitHub repository to Cloudflare Pages for automatic deployments on push.

## How It Works

1. **Frontend:** The user interface collects search parameters and displays results with real-time progress tracking
2. **Geocoding:** For city searches, the Nominatim API converts city names to bounding boxes
3. **Overpass Query:** The backend queries OpenStreetMap's Overpass API for abandoned places using a comprehensive set of tags
4. **Filtering:** Results are filtered to exclude tourist attractions and memorials, then deduplicated
5. **Grouping:** Places within 150 meters can be grouped together (optional) for easier navigation
6. **Results:** Found places are displayed on an interactive map with markers and in a sortable sidebar

## OpenStreetMap Tags Queried

The application searches for places tagged with various abandoned/disused indicators. All filters can be toggled individually:

**Basic Status:**
- `abandoned=yes`
- `disused=yes`

**Ruins:**
- `ruins=yes`
- `historic=ruins`

**Railways:**
- `railway=abandoned`
- `railway=disused`
- `disused:railway=station`
- `abandoned:railway=station`

**Buildings:**
- `building:condition=ruinous` (matches: ruinous, partly_ruinous, mainly_ruinous, completely_ruinous)
- `building=ruins`

**Amenities:**
- `disused:amenity=*`
- `abandoned:amenity=*`

**Shops:**
- `disused:shop=*`
- `abandoned:shop=*`
- `shop=vacant`

**Land Use:**
- `landuse=brownfield`

**Aeroways:**
- `disused:aeroway=*`
- `abandoned:aeroway=*`

The query searches nodes, ways, and relations matching these tags within the specified search area. Tourist attractions and memorials are automatically filtered out to reduce false positives.

## API Endpoint

The backend exposes a single endpoint:

**GET `/api/search`**

Query Parameters:
- `type`: Search type (`city`, `radius`, or `polygon`)
- `area`: City name (for `type=city`)
- `lat`, `lon`, `radius`: Coordinates and radius (for `type=radius`)
- `polygon`: Comma-separated coordinates `lat1,lon1,lat2,lon2,...` (for `type=polygon`)

**Filter Parameters** (all default to `true` if not specified):
- `abandoned`: Include abandoned places
- `disused`: Include disused places
- `ruinsYes`: Include ruins=yes
- `historicRuins`: Include historic=ruins
- `railwayAbandoned`: Include railway=abandoned
- `railwayDisused`: Include railway=disused
- `disusedRailwayStation`: Include disused:railway=station
- `abandonedRailwayStation`: Include abandoned:railway=station
- `buildingConditionRuinous`: Include building:condition=ruinous
- `buildingRuins`: Include building=ruins
- `disusedAmenity`: Include disused:amenity=*
- `abandonedAmenity`: Include abandoned:amenity=*
- `disusedShop`: Include disused:shop=*
- `abandonedShop`: Include abandoned:shop=*
- `shopVacant`: Include shop=vacant
- `landuseBrownfield`: Include landuse=brownfield
- `disusedAeroway`: Include disused:aeroway=*
- `abandonedAeroway`: Include abandoned:aeroway=*

Set any filter to `false` to exclude that category from results.

Response:
```json
{
  "places": [
    {
      "id": 123456,
      "type": "way",
      "lat": 40.7128,
      "lon": -74.0060,
      "name": "Abandoned Building",
      "tags": { ... }
    }
  ],
  "count": 1,
  "searchArea": { ... }
}
```

## Technical Details

- **Frontend:** 
  - Vanilla JavaScript with Leaflet.js for map visualization
  - Leaflet.markercluster for marker clustering
  - Lucide Icons for UI icons
  - Dark theme with responsive design
  - Real-time progress tracking with animated progress bars
  - Interactive map previews for radius and polygon searches
- **Backend:** Cloudflare Pages Functions (serverless)
- **APIs Used:**
  - Nominatim API for geocoding
  - Overpass API for OpenStreetMap queries (60 second timeout)
- **Map Tiles:** 
  - OpenStreetMap (default)
  - Google Maps Satellite
  - Bing Maps Satellite
  - Esri World Imagery

## Rate Limiting

Both Nominatim and Overpass APIs have usage policies:
- Include a User-Agent header (already implemented)
- Be respectful of rate limits
- For production use, consider caching results or using a dedicated Overpass instance

## License

This project is open source and available for use.

## Contributing

Feel free to submit issues and enhancement requests!
