# AutoBex 2

A web application that finds abandoned places by querying OpenStreetMap data. Search by city name, coordinates with radius, or custom polygon areas.

## Features

- **Three Search Methods:**
  - City/Place Names: Enter a city name and search within its boundaries
  - Coordinates + Radius: Specify a center point and search radius in kilometers
  - Polygon Coordinates: Define a custom search area with multiple coordinate points

- **Interactive Map:** View results on an interactive Leaflet map with markers for each abandoned place

- **Filter Options:** Include or exclude ruins and disused places in your search

- **Results Display:** Browse found places with details including name, type, and location tags

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
└── README.md               # This file
```

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Run locally:**
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
2. Enter:
   - Latitude (e.g., 40.7128)
   - Longitude (e.g., -74.0060)
   - Radius in kilometers (e.g., 5)
3. Click "Search"

### Polygon Search
1. Select "Polygon Coordinates" from the search type dropdown
2. Enter coordinates, one per line, in the format `lat,lon`:
```
40.7128,-74.0060
40.7228,-74.0060
40.7228,-74.0160
40.7128,-74.0160
```
3. Click "Search"

**Note:** Polygons must have at least 3 coordinate points.

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

1. **Frontend:** The user interface collects search parameters and displays results
2. **Geocoding:** For city searches, the Nominatim API converts city names to bounding boxes
3. **Overpass Query:** The backend queries OpenStreetMap's Overpass API for abandoned places
4. **Results:** Found places are displayed on an interactive map with markers

## OpenStreetMap Tags Queried

The application searches for places tagged with:
- `abandoned=yes` + `building=*`
- `disused=yes` + `building=*` (if enabled)
- `ruins=yes` (if enabled)
- `historic=ruins` (if enabled)

## API Endpoint

The backend exposes a single endpoint:

**GET `/api/search`**

Query Parameters:
- `type`: Search type (`city`, `radius`, or `polygon`)
- `area`: City name (for `type=city`)
- `lat`, `lon`, `radius`: Coordinates and radius (for `type=radius`)
- `polygon`: Comma-separated coordinates `lat1,lon1,lat2,lon2,...` (for `type=polygon`)
- `includeRuins`: Boolean (default: `true`)
- `includeDisused`: Boolean (default: `true`)

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

- **Frontend:** Vanilla JavaScript with Leaflet.js for map visualization
- **Backend:** Cloudflare Pages Functions (serverless)
- **APIs Used:**
  - Nominatim API for geocoding
  - Overpass API for OpenStreetMap queries
- **Map Tiles:** OpenStreetMap tiles

## Rate Limiting

Both Nominatim and Overpass APIs have usage policies:
- Include a User-Agent header (already implemented)
- Be respectful of rate limits
- For production use, consider caching results or using a dedicated Overpass instance

## License

This project is open source and available for use.

## Contributing

Feel free to submit issues and enhancement requests!
