let map;
let markers = [];
let markerClusterGroup = null;
let searchAreaLayer = null;
let polygonPoints = [];
let polygonMarkers = [];
let radiusCenterMarker = null;
let isClickModeActive = false;
let currentBasemap = null;
let basemapLayers = {};
let placeGroups = [];
let currentTool = 'search';

// Bing Maps tile layer with quadkey conversion
const BingMapsLayer = L.TileLayer.extend({
    getTileUrl: function(coords) {
        const quadkey = this._getQuadKey(coords.x, coords.y, coords.z);
        const subdomain = (coords.x + coords.y) % 4;
        // Use 'a' for aerial/satellite imagery instead of 'r' for roads
        return `https://ecn.t${subdomain}.tiles.virtualearth.net/tiles/a${quadkey}.jpeg?g=1&key=Arzdiw4nlOJz6w2UoJhLw0l`;
    },
    _getQuadKey: function(x, y, z) {
        let quadkey = '';
        for (let i = z; i > 0; i--) {
            let bit = 0;
            const mask = 1 << (i - 1);
            if ((x & mask) !== 0) bit++;
            if ((y & mask) !== 0) bit += 2;
            quadkey += bit.toString();
        }
        return quadkey;
    }
});

// Initialize basemap layers
function initBasemaps() {
    basemapLayers = {
        light: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }),
        google: L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20
        }),
        bing: new BingMapsLayer('', {
            attribution: '&copy; <a href="https://www.microsoft.com/maps">Bing Maps</a>',
            maxZoom: 19,
            tileSize: 256
        }),
        esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
            maxZoom: 19
        })
    };
}

// Switch basemap
function switchBasemap(basemapName) {
    if (currentBasemap) {
        map.removeLayer(currentBasemap);
    }
    
    currentBasemap = basemapLayers[basemapName];
    if (currentBasemap) {
        currentBasemap.addTo(map);
    }
}

// Initialize map
function initMap() {
    // Initialize basemaps
    initBasemaps();
    
    // Create map
    map = L.map('map', { zoomControl: false }).setView([40.7128, -74.0060], 10);
    
    // Position zoom control to top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add default light basemap
    switchBasemap('light');
    
    // Initialize marker cluster group as a layer group container
    markerClusterGroup = L.layerGroup();
    markerClusterGroup.addTo(map);
}

// Show status message
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = message;
    statusEl.className = type;
    statusEl.style.display = 'block';
}

// Progress indicator functions
let progressAnimationId = null;

function showProgress() {
    document.getElementById('progressContainer').style.display = 'block';
    updateProgress(0, 'Preparing search...');
    updateProgressSteps([]);
}

function hideProgress() {
    if (progressAnimationId) {
        cancelAnimationFrame(progressAnimationId);
        progressAnimationId = null;
    }
    document.getElementById('progressContainer').style.display = 'none';
}

function updateProgress(percent, text, smooth = false) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    
    if (smooth) {
        // Smooth animation to target percent
        const startPercent = parseFloat(progressBar.style.width) || 0;
        const targetPercent = Math.max(0, Math.min(100, percent));
        const duration = 500; // 500ms animation
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function for smooth animation
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentPercent = startPercent + (targetPercent - startPercent) * easeProgress;
            
            progressBar.style.width = `${currentPercent}%`;
            progressPercent.textContent = `${Math.round(currentPercent)}%`;
            
            if (progress < 1) {
                progressAnimationId = requestAnimationFrame(animate);
            } else {
                progressAnimationId = null;
            }
        };
        
        if (progressAnimationId) {
            cancelAnimationFrame(progressAnimationId);
        }
        progressAnimationId = requestAnimationFrame(animate);
    } else {
        // Instant update
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${Math.round(percent)}%`;
    }
    
    if (text) {
        progressText.textContent = text;
    }
}

function simulateProgress(startPercent, endPercent, duration, onUpdate) {
    const startTime = Date.now();
    const range = endPercent - startPercent;
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentPercent = startPercent + (range * progress);
        
        if (onUpdate) {
            onUpdate(currentPercent);
        }
        
        if (progress < 1) {
            progressAnimationId = requestAnimationFrame(animate);
        } else {
            progressAnimationId = null;
        }
    };
    
    if (progressAnimationId) {
        cancelAnimationFrame(progressAnimationId);
    }
    progressAnimationId = requestAnimationFrame(animate);
}

function updateProgressSteps(steps) {
    const stepsContainer = document.getElementById('progressSteps');
    if (steps.length === 0) {
        stepsContainer.innerHTML = '';
        return;
    }
    
    stepsContainer.innerHTML = steps.map(step => {
        const icon = step.completed ? 'check-circle' : step.active ? 'loader' : 'circle';
        const statusClass = step.completed ? 'completed' : step.active ? 'active' : '';
        return `
            <div class="progress-step ${statusClass}">
                <i data-lucide="${icon}"></i>
                <span>${step.text}</span>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

// Clear map markers and search area (but keep preview markers)
function clearMap() {
    // Clear marker cluster group
    if (markerClusterGroup) {
        markerClusterGroup.clearLayers();
    }
    markers = [];
    
    // Only remove search area if it's a result area, not a preview
    // We'll handle this in the search function
}

// Clear polygon points
function clearPolygonPoints() {
    polygonPoints = [];
    polygonMarkers.forEach(marker => map.removeLayer(marker));
    polygonMarkers = [];
    updatePolygonTextarea();
    updatePolygonPreview();
}

// Clear radius center
function clearRadiusCenter() {
    if (radiusCenterMarker) {
        map.removeLayer(radiusCenterMarker);
        radiusCenterMarker = null;
    }
    document.getElementById('latInput').value = '';
    document.getElementById('lonInput').value = '';
}

// Update polygon textarea from points
function updatePolygonTextarea() {
    const textarea = document.getElementById('polygonTextarea');
    if (polygonPoints.length > 0) {
        textarea.value = polygonPoints.map(p => `${p.lat},${p.lon}`).join('\n');
    } else {
        textarea.value = '';
    }
    document.getElementById('polygonPointCount').textContent = `${polygonPoints.length} points`;
}

// Update polygon preview on map
function updatePolygonPreview() {
    // Remove existing preview
    polygonMarkers.forEach(marker => map.removeLayer(marker));
    polygonMarkers = [];
    
    if (polygonPoints.length === 0) return;
    
    // Add markers for each point
    polygonPoints.forEach((point, index) => {
        const marker = L.marker([point.lat, point.lon], {
            icon: L.divIcon({
                className: 'polygon-point-marker',
                html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">${index + 1}</div>`,
                iconSize: [16, 16]
            })
        }).addTo(map);
        polygonMarkers.push(marker);
    });
    
    // Draw preview polygon if we have at least 3 points
    if (polygonPoints.length >= 3) {
        const latLngs = polygonPoints.map(p => [p.lat, p.lon]);
        // Close the polygon
        latLngs.push([polygonPoints[0].lat, polygonPoints[0].lon]);
        
        // Remove old preview if exists
        if (searchAreaLayer && searchAreaLayer instanceof L.Polyline) {
            map.removeLayer(searchAreaLayer);
        }
        
        searchAreaLayer = L.polyline(latLngs, {
            color: '#3b82f6',
            weight: 2,
            dashArray: '5, 5',
            opacity: 0.7
        }).addTo(map);
    }
}

// Generate Google Maps URL
function getGoogleMapsUrl(lat, lon, name = '') {
    const query = name ? encodeURIComponent(name) : `${lat},${lon}`;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

// Generate Bing Maps URL
function getBingMapsUrl(lat, lon, name = '') {
    return `https://www.bing.com/maps?cp=${lat}~${lon}&lvl=15&sp=point.${lat}_${lon}_${encodeURIComponent(name || 'Location')}`;
}

// Calculate distance between two coordinates (Haversine formula) in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Group places by proximity
function groupPlacesByProximity(places, thresholdMeters = 150) {
    const groups = [];
    const used = new Set();
    
    for (let i = 0; i < places.length; i++) {
        if (used.has(i)) continue;
        
        const group = {
            id: groups.length,
            places: [places[i]],
            centerLat: places[i].lat,
            centerLon: places[i].lon,
            name: null
        };
        used.add(i);
        
        // Find nearby places
        for (let j = i + 1; j < places.length; j++) {
            if (used.has(j)) continue;
            
            const distance = calculateDistance(
                places[i].lat, places[i].lon,
                places[j].lat, places[j].lon
            );
            
            if (distance <= thresholdMeters) {
                group.places.push(places[j]);
                used.add(j);
                
                // Update center (average of all places in group)
                group.centerLat = group.places.reduce((sum, p) => sum + p.lat, 0) / group.places.length;
                group.centerLon = group.places.reduce((sum, p) => sum + p.lon, 0) / group.places.length;
            }
        }
        
        // Generate group name
        if (group.places.length > 1) {
            const namedPlaces = group.places.filter(p => p.name);
            if (namedPlaces.length > 0) {
                group.name = `${namedPlaces[0].name} Area`;
            } else if (group.places[0].address) {
                const street = group.places[0].address.split(',')[0];
                group.name = `${street} Area`;
            } else {
                group.name = `Group ${group.id + 1}`;
            }
        } else {
            group.name = group.places[0].name || 'Single Location';
        }
        
        groups.push(group);
    }
    
    return groups;
}

// Add marker to map
function addMarker(place) {
    const lat = place.lat;
    const lon = place.lon;
    
    // Build status tags
    const statusTags = [];
    if (place.tags.abandoned === 'yes') statusTags.push('Abandoned');
    if (place.tags.disused === 'yes') statusTags.push('Disused');
    if (place.tags.ruins === 'yes') statusTags.push('Ruins');
    if (place.tags.historic === 'ruins') statusTags.push('Historic Ruins');
    
    // Determine display name
    let displayName = place.name;
    if (!displayName) {
        // Try to create a better name from available info
        if (place.address) {
            displayName = place.address.split(',')[0]; // Use street address
        } else if (place.buildingType) {
            displayName = `${place.buildingType.charAt(0).toUpperCase() + place.buildingType.slice(1)} Structure`;
        } else if (place.additionalInfo?.state) {
            displayName = `Abandoned Place (${place.additionalInfo.state})`;
        } else {
            displayName = 'Abandoned Place';
        }
    }
    
    // Build popup content with more information
    const popupParts = [];
    
    // Title
    popupParts.push(`<h3>${displayName}</h3>`);
    
    // Building type
    if (place.buildingType) {
        popupParts.push(`<p class="popup-type"><strong>Type:</strong> ${place.buildingType}</p>`);
    }
    
    // Address
    if (place.address) {
        popupParts.push(`<p class="popup-address"><strong>Address:</strong> ${place.address}</p>`);
    }
    
    // Additional location info
    if (place.additionalInfo?.state || place.additionalInfo?.country) {
        const locationParts = [];
        if (place.additionalInfo.state) locationParts.push(place.additionalInfo.state);
        if (place.additionalInfo.country) locationParts.push(place.additionalInfo.country);
        if (locationParts.length > 0) {
            popupParts.push(`<p class="popup-location">${locationParts.join(', ')}</p>`);
        }
    }
    
    // Status tags
    if (statusTags.length > 0) {
        popupParts.push(`<div class="popup-tags">${statusTags.map(t => `<span>${t}</span>`).join('')}</div>`);
    } else {
        // If no specific tags, show generic abandoned status
        popupParts.push(`<div class="popup-tags"><span>Abandoned</span></div>`);
    }
    
    // Map links
    const googleMapsUrl = getGoogleMapsUrl(lat, lon, displayName);
    const bingMapsUrl = getBingMapsUrl(lat, lon, displayName);
    popupParts.push(`
        <div class="popup-actions">
            <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="popup-btn popup-btn-google">
                <i data-lucide="external-link"></i>
                Google Maps
            </a>
            <a href="${bingMapsUrl}" target="_blank" rel="noopener noreferrer" class="popup-btn popup-btn-bing">
                <i data-lucide="external-link"></i>
                Bing Maps
            </a>
        </div>
    `);
    
    const popupContent = `<div class="map-popup">${popupParts.join('')}</div>`;
    
    // Custom icon for markers
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #f59e0b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [12, 12]
    });

    const marker = L.marker([lat, lon], { icon: customIcon })
        .bindPopup(popupContent);
    
    // Add to cluster group instead of directly to map
    markerClusterGroup.addLayer(marker);
    markers.push(marker);
    
    // Initialize icons in popup after it's added
    marker.on('popupopen', () => {
        lucide.createIcons();
    });
}

// Draw search area on map
function drawSearchArea(type, data) {
    if (searchAreaLayer) {
        map.removeLayer(searchAreaLayer);
    }
    
    const areaStyle = {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 5'
    };

    if (type === 'city' && data.bbox) {
        const bbox = data.bbox;
        const bounds = [[bbox[0], bbox[2]], [bbox[1], bbox[3]]];
        searchAreaLayer = L.rectangle(bounds, areaStyle).addTo(map);
        map.fitBounds(bounds);
    } else if (type === 'radius' && data.lat && data.lon && data.radius) {
        searchAreaLayer = L.circle([data.lat, data.lon], {
            ...areaStyle,
            radius: data.radius * 1000
        }).addTo(map);
        map.setView([data.lat, data.lon], Math.max(10, 15 - Math.log10(data.radius)));
    } else if (type === 'polygon' && data.coordinates) {
        const latLngs = data.coordinates.map(coord => [coord.lat, coord.lon]);
        searchAreaLayer = L.polygon(latLngs, areaStyle).addTo(map);
        map.fitBounds(searchAreaLayer.getBounds());
    }
}

// Validate coordinates
function validateCoordinate(lat, lon) {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// Parse polygon coordinates from textarea
function parsePolygonCoordinates(text) {
    const lines = text.trim().split('\n');
    const coordinates = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const parts = trimmed.split(',');
        if (parts.length !== 2) {
            throw new Error(`Invalid coordinate format: ${trimmed}. Expected "lat,lon"`);
        }
        
        const lat = parseFloat(parts[0].trim());
        const lon = parseFloat(parts[1].trim());
        
        if (isNaN(lat) || isNaN(lon)) {
            throw new Error(`Invalid coordinate values: ${trimmed}`);
        }
        
        if (!validateCoordinate(lat, lon)) {
            throw new Error(`Coordinate out of range: ${trimmed}`);
        }
        
        coordinates.push({ lat, lon });
    }
    
    if (coordinates.length < 3) {
        throw new Error('Polygon must have at least 3 coordinates');
    }
    
    return coordinates;
}

// Search for abandoned places
async function searchAbandonedPlaces() {
    const searchType = document.getElementById('searchType').value;
    const searchBtn = document.getElementById('searchBtn');
    
    // Collect all filter selections
    const filters = {
        abandoned: document.getElementById('filter-abandoned').checked,
        disused: document.getElementById('filter-disused').checked,
        ruinsYes: document.getElementById('filter-ruins-yes').checked,
        historicRuins: document.getElementById('filter-historic-ruins').checked,
        railwayAbandoned: document.getElementById('filter-railway-abandoned').checked,
        railwayDisused: document.getElementById('filter-railway-disused').checked,
        disusedRailwayStation: document.getElementById('filter-disused-railway-station').checked,
        abandonedRailwayStation: document.getElementById('filter-abandoned-railway-station').checked,
        buildingConditionRuinous: document.getElementById('filter-building-condition-ruinous').checked,
        buildingRuins: document.getElementById('filter-building-ruins').checked,
        disusedAmenity: document.getElementById('filter-disused-amenity').checked,
        abandonedAmenity: document.getElementById('filter-abandoned-amenity').checked,
        disusedShop: document.getElementById('filter-disused-shop').checked,
        abandonedShop: document.getElementById('filter-abandoned-shop').checked,
        shopVacant: document.getElementById('filter-shop-vacant').checked,
        landuseBrownfield: document.getElementById('filter-landuse-brownfield').checked,
        disusedAeroway: document.getElementById('filter-disused-aeroway').checked,
        abandonedAeroway: document.getElementById('filter-abandoned-aeroway').checked
    };
    
    console.log('🔍 [AutoBex 2] Starting search...');
    console.log('📋 [Search Params]', { searchType, filters });
    
    let params = new URLSearchParams({
        type: searchType
    });
    
    // Add all filter parameters
    Object.keys(filters).forEach(key => {
        params.append(key, filters[key]);
    });
    
    try {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span>Searching...</span>';
        
        // Show progress indicator
        showProgress();
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress(5, 'Preparing search...', true);
        
        // Clear only result markers, keep preview markers
        console.log('🗑️  [Cleanup] Clearing previous result markers...');
        if (markerClusterGroup) {
            markerClusterGroup.clearLayers();
        }
        markers = [];
        
        // Store preview layer reference to restore if needed
        const previewLayer = searchAreaLayer;
        
        // Validate and prepare parameters based on search type
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(10, 'Validating search parameters...', true);
        const steps = [];
        
        if (searchType === 'city') {
            const area = document.getElementById('areaInput').value.trim();
            if (!area) {
                throw new Error('Please enter an area name');
            }
            console.log('🏙️  [City Search] Area:', area);
            params.append('area', area);
            steps.push({ text: 'Geocoding location...', active: true, completed: false });
            await new Promise(resolve => setTimeout(resolve, 300));
            updateProgress(15, 'Looking up location...', true);
        } else if (searchType === 'radius') {
            const lat = parseFloat(document.getElementById('latInput').value);
            const lon = parseFloat(document.getElementById('lonInput').value);
            const radius = parseFloat(document.getElementById('radiusInputField').value);
            
            if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
                throw new Error('Please enter valid latitude, longitude, and radius');
            }
            
            if (!validateCoordinate(lat, lon)) {
                throw new Error('Latitude must be between -90 and 90, longitude between -180 and 180');
            }
            
            if (radius <= 0) {
                throw new Error('Radius must be greater than 0');
            }
            
            console.log('📍 [Radius Search]', { lat, lon, radius: `${radius}km` });
            params.append('lat', lat);
            params.append('lon', lon);
            params.append('radius', radius);
            steps.push({ text: 'Calculating search area...', active: true, completed: false });
            await new Promise(resolve => setTimeout(resolve, 200));
            updateProgress(15, 'Calculating search bounds...', true);
        } else if (searchType === 'polygon') {
            // Use polygon points from map clicks if available, otherwise parse textarea
            let coordinates;
            if (polygonPoints.length >= 3) {
                coordinates = polygonPoints;
                console.log('🗺️  [Polygon Search] Using', polygonPoints.length, 'points from map clicks');
            } else {
                const polygonText = document.getElementById('polygonTextarea').value.trim();
                if (!polygonText) {
                    throw new Error('Please enter polygon coordinates or click on the map to add points');
                }
                console.log('🗺️  [Polygon Search] Parsing coordinates from textarea...');
                coordinates = parsePolygonCoordinates(polygonText);
                console.log('🗺️  [Polygon Search] Parsed', coordinates.length, 'coordinates');
            }
            
            if (coordinates.length < 3) {
                throw new Error('Polygon must have at least 3 points');
            }
            
            const polygonStr = coordinates.map(c => `${c.lat},${c.lon}`).join(',');
            params.append('polygon', polygonStr);
            steps.push({ text: 'Processing polygon area...', active: true, completed: false });
            await new Promise(resolve => setTimeout(resolve, 200));
            updateProgress(15, 'Processing polygon coordinates...', true);
        }
        
        updateProgressSteps(steps);
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(20, 'Building Overpass query...', true);
        
        const apiUrl = `/api/search?${params}`;
        console.log('🌐 [API Request] Sending request to:', apiUrl);
        const requestStartTime = Date.now();
        
        // Update progress steps
        steps[steps.length - 1] = { ...steps[steps.length - 1], active: false, completed: true };
        steps.push({ text: 'Querying OpenStreetMap...', active: true, completed: false });
        updateProgressSteps(steps);
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(25, 'Connecting to Overpass API...', true);
        
        // Simulate progress during API call (25% to 55%)
        const progressPromise = new Promise(resolve => {
            simulateProgress(25, 55, 3000, (percent) => {
                updateProgress(percent, 'Querying OpenStreetMap database...', false);
            });
            resolve();
        });
        
        const fetchPromise = fetch(apiUrl);
        
        // Wait for both to complete (or just the fetch)
        const response = await fetchPromise;
        await progressPromise;
        
        const requestDuration = Date.now() - requestStartTime;
        console.log(`⏱️  [API Response] Received in ${requestDuration}ms, status:`, response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ [API Error]', errorData);
            throw new Error(errorData.error || `Search failed: ${response.statusText}`);
        }
        
        updateProgress(60, 'Processing results...', true);
        steps[steps.length - 1] = { text: 'Querying OpenStreetMap...', active: false, completed: true };
        steps.push({ text: 'Processing results...', active: true, completed: false });
        updateProgressSteps(steps);
        
        const data = await response.json();
        console.log('📦 [API Data] Received response:', {
            placesCount: data.places?.length || 0,
            hasSearchArea: !!data.searchArea,
            count: data.count
        });
        
        if (data.error) {
            console.error('❌ [Data Error]', data.error);
            throw new Error(data.error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(70, 'Drawing search area...', true);
        steps[steps.length - 1] = { text: 'Processing results...', active: false, completed: true };
        steps.push({ text: 'Drawing search area...', active: true, completed: false });
        updateProgressSteps(steps);
        
        // Remove preview layer and draw result search area
        if (previewLayer) {
            console.log('🗑️  [Cleanup] Removing preview layer...');
            map.removeLayer(previewLayer);
        }
        
        // Draw search area from results
        if (data.searchArea) {
            console.log('🎨 [Map] Drawing search area...');
            drawSearchArea(searchType, data.searchArea);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        steps[steps.length - 1] = { text: 'Drawing search area...', active: false, completed: true };
        steps.push({ text: `Adding ${data.places.length} markers...`, active: true, completed: false });
        updateProgressSteps(steps);
        updateProgress(75, `Adding ${data.places.length} markers to map...`, true);
        
        // Group places by proximity (if enabled)
        const enableGrouping = document.getElementById('enableGrouping').checked;
        let groupingStartTime = Date.now();
        
        if (enableGrouping) {
            console.log('📊 [Grouping] Grouping places by proximity...');
            placeGroups = groupPlacesByProximity(data.places, 150); // 150 meter threshold
            console.log(`📊 [Grouping] Created ${placeGroups.length} groups from ${data.places.length} places`);
        } else {
            console.log('📊 [Grouping] Grouping disabled - showing all places individually');
            // Create individual groups for each place (no grouping)
            placeGroups = data.places.map((place, index) => ({
                id: index,
                places: [place],
                centerLat: place.lat,
                centerLon: place.lon,
                name: place.name || 'Location'
            }));
        }
        
        updateProgress(75, 'Adding markers to map...', true);
        steps[steps.length - 1] = { text: `Adding ${data.places.length} markers...`, active: true, completed: false };
        updateProgressSteps(steps);
        
        // Update map clustering based on groups
        const markerStartTime = Date.now();
        updateMapClusters(placeGroups, enableGrouping);
        const markerDuration = Date.now() - markerStartTime;
        console.log(`✅ [Map] All markers added in ${markerDuration}ms`);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(95, 'Finalizing...', true);
        steps[steps.length - 1] = { text: `Added ${data.places.length} markers`, active: false, completed: true };
        updateProgressSteps(steps);
        
        displayResults(data.places, placeGroups);
        
        // Fit map to show all markers if we have results
        if (data.places.length > 0) {
            console.log('🔍 [Map] Fitting bounds to show all results...');
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
        
        const totalDuration = Date.now() - requestStartTime;
        console.log(`✨ [Search Complete] Found ${data.places.length} places in ${totalDuration}ms`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        updateProgress(100, `Search complete! Found ${data.places.length} places`, true);
        steps.push({ text: 'Complete!', active: false, completed: true });
        updateProgressSteps(steps);
        
        // Hide progress after a short delay
        setTimeout(() => {
            hideProgress();
        }, 2000);
        
        showStatus(`Found <strong>${data.places.length}</strong> locations`, 'info');
        
    } catch (error) {
        console.error('❌ [Search Error]', error);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        hideProgress();
        showStatus(`Error: ${error.message}`, 'error');
        clearMap();
        displayResults([]);
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i data-lucide="search"></i> Find Places';
        lucide.createIcons();
    }
}

// Update map clusters based on groups
function updateMapClusters(groups, enableGrouping = true) {
    // Clear existing clusters
    if (markerClusterGroup) {
        markerClusterGroup.clearLayers();
    }
    markers = [];
    
    if (!enableGrouping) {
        // No grouping - add all markers directly with standard clustering
        const allMarkers = [];
        groups.forEach(group => {
            group.places.forEach(place => {
                const marker = createMarkerForPlace(place);
                allMarkers.push(marker);
                markers.push(marker);
            });
        });
        
        // Use standard marker clustering
        const standardClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: function(cluster) {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count > 20) size = 'medium';
                if (count > 50) size = 'large';
                
                return L.divIcon({
                    html: `<div class="marker-cluster marker-cluster-${size}">${count}</div>`,
                    className: 'marker-cluster-container',
                    iconSize: L.point(40, 40)
                });
            }
        });
        
        allMarkers.forEach(m => standardClusterGroup.addLayer(m));
        markerClusterGroup.addLayer(standardClusterGroup);
        return;
    }
    
    // Grouping enabled - create separate cluster groups for each group
    groups.forEach((group, groupIndex) => {
        const groupMarkers = [];
        
        // Create markers for all places in this group
        group.places.forEach(place => {
            const marker = createMarkerForPlace(place);
            groupMarkers.push(marker);
            markers.push(marker);
        });
        
        if (group.places.length > 1) {
            // Multiple places - create a cluster group for this group
            const clusterGroup = L.markerClusterGroup({
                maxClusterRadius: 50, // Small radius to keep grouped places together
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                iconCreateFunction: function(cluster) {
                    const count = cluster.getChildCount();
                    let size = 'small';
                    if (count > 20) size = 'medium';
                    if (count > 50) size = 'large';
                    
                    return L.divIcon({
                        html: `<div class="marker-cluster marker-cluster-${size}">${count}</div>`,
                        className: 'marker-cluster-container',
                        iconSize: L.point(40, 40)
                    });
                }
            });
            
            groupMarkers.forEach(m => clusterGroup.addLayer(m));
            markerClusterGroup.addLayer(clusterGroup);
        } else {
            // Single place - add directly to main cluster group
            markerClusterGroup.addLayer(groupMarkers[0]);
        }
    });
}

// Create marker for a place (extracted from addMarker)
function createMarkerForPlace(place) {
    const lat = place.lat;
    const lon = place.lon;
    
    // Build status tags
    const statusTags = [];
    if (place.tags.abandoned === 'yes') statusTags.push('Abandoned');
    if (place.tags.disused === 'yes') statusTags.push('Disused');
    if (place.tags.ruins === 'yes') statusTags.push('Ruins');
    if (place.tags.historic === 'ruins') statusTags.push('Historic Ruins');
    
    // Determine display name
    let displayName = place.name;
    if (!displayName) {
        if (place.address) {
            displayName = place.address.split(',')[0];
        } else if (place.buildingType) {
            displayName = `${place.buildingType.charAt(0).toUpperCase() + place.buildingType.slice(1)} Structure`;
        } else if (place.additionalInfo?.state) {
            displayName = `Abandoned Place (${place.additionalInfo.state})`;
        } else {
            displayName = 'Abandoned Place';
        }
    }
    
    // Build popup content
    const popupParts = [];
    popupParts.push(`<h3>${displayName}</h3>`);
    
    if (place.buildingType) {
        popupParts.push(`<p class="popup-type"><strong>Type:</strong> ${place.buildingType}</p>`);
    }
    
    if (place.address) {
        popupParts.push(`<p class="popup-address"><strong>Address:</strong> ${place.address}</p>`);
    }
    
    if (place.additionalInfo?.state || place.additionalInfo?.country) {
        const locationParts = [];
        if (place.additionalInfo.state) locationParts.push(place.additionalInfo.state);
        if (place.additionalInfo.country) locationParts.push(place.additionalInfo.country);
        if (locationParts.length > 0) {
            popupParts.push(`<p class="popup-location">${locationParts.join(', ')}</p>`);
        }
    }
    
    if (statusTags.length > 0) {
        popupParts.push(`<div class="popup-tags">${statusTags.map(t => `<span>${t}</span>`).join('')}</div>`);
    } else {
        popupParts.push(`<div class="popup-tags"><span>Abandoned</span></div>`);
    }
    
    const googleMapsUrl = getGoogleMapsUrl(lat, lon, displayName);
    const bingMapsUrl = getBingMapsUrl(lat, lon, displayName);
    popupParts.push(`
        <div class="popup-actions">
            <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="popup-btn popup-btn-google">
                <i data-lucide="external-link"></i>
                Google Maps
            </a>
            <a href="${bingMapsUrl}" target="_blank" rel="noopener noreferrer" class="popup-btn popup-btn-bing">
                <i data-lucide="external-link"></i>
                Bing Maps
            </a>
        </div>
    `);
    
    const popupContent = `<div class="map-popup">${popupParts.join('')}</div>`;
    
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #f59e0b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [12, 12]
    });

    const marker = L.marker([lat, lon], { icon: customIcon })
        .bindPopup(popupContent);
    
    marker.on('popupopen', () => {
        lucide.createIcons();
    });
    
    return marker;
}

// Sort places by different criteria
function sortPlaces(places, sortBy, mapCenter = null) {
    const sorted = [...places];
    
    switch(sortBy) {
        case 'name':
            sorted.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
        case 'name-desc':
            sorted.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameB.localeCompare(nameA);
            });
            break;
        case 'type':
            sorted.sort((a, b) => {
                const typeA = (a.buildingType || a.tags.building || '').toLowerCase();
                const typeB = (b.buildingType || b.tags.building || '').toLowerCase();
                return typeA.localeCompare(typeB);
            });
            break;
        case 'distance':
            if (mapCenter) {
                sorted.sort((a, b) => {
                    const distA = calculateDistance(mapCenter.lat, mapCenter.lon, a.lat, a.lon);
                    const distB = calculateDistance(mapCenter.lat, mapCenter.lon, b.lat, b.lon);
                    return distA - distB;
                });
            }
            break;
    }
    
    return sorted;
}

// Display results with grouping
function displayResults(places, groups) {
    const resultList = document.getElementById('resultList');
    const resultCount = document.getElementById('resultCount');
    const enableGrouping = document.getElementById('enableGrouping').checked;
    const sortSection = document.getElementById('sortSection');
    
    resultCount.textContent = places.length;
    
    // Show/hide sort section based on grouping
    if (enableGrouping) {
        sortSection.style.display = 'none';
    } else {
        sortSection.style.display = 'block';
    }
    
    if (places.length === 0) {
        resultList.innerHTML = '<div class="empty-state"><i data-lucide="map-pin" size="40"></i><p>No abandoned places found here.</p></div>';
        lucide.createIcons();
        return;
    }
    
    if (!groups || groups.length === 0) {
        groups = groupPlacesByProximity(places, 150);
    }
    
    // If grouping is disabled, sort places before creating individual groups
    if (!enableGrouping) {
        const sortBy = document.getElementById('sortSelect').value;
        const mapCenter = map.getCenter();
        const sortedPlaces = sortPlaces(places, sortBy, { lat: mapCenter.lat, lon: mapCenter.lng });
        
        // Recreate groups from sorted places
        groups = sortedPlaces.map((place, index) => ({
            id: index,
            places: [place],
            centerLat: place.lat,
            centerLon: place.lon,
            name: place.name || 'Location'
        }));
    } else {
        // Sort groups: groups with multiple places first, then single places
        groups = [...groups].sort((a, b) => {
            if (a.places.length > 1 && b.places.length === 1) return -1;
            if (a.places.length === 1 && b.places.length > 1) return 1;
            return 0;
        });
    }
    
    const sortedGroups = groups;
    
    // Re-index groups after sorting
    resultList.innerHTML = sortedGroups.map((group, groupIndex) => {
        if (group.places.length === 1) {
            // Single place - no grouping needed
            const place = group.places[0];
            return renderPlaceCard(place, groupIndex);
        } else {
            // Multiple places - create collapsible group
            return renderPlaceGroup(group, groupIndex);
        }
    }).join('');
    
    lucide.createIcons();
    
    // Add event listeners for collapsible groups
    groups.forEach((group, groupIndex) => {
        if (group.places.length > 1) {
            const toggleBtn = document.getElementById(`group-toggle-${groupIndex}`);
            const groupContent = document.getElementById(`group-content-${groupIndex}`);
            if (toggleBtn && groupContent) {
                toggleBtn.addEventListener('click', () => {
                    const isExpanded = groupContent.style.display !== 'none';
                    groupContent.style.display = isExpanded ? 'none' : 'block';
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.setAttribute('data-lucide', isExpanded ? 'chevron-right' : 'chevron-down');
                        lucide.createIcons();
                    }
                });
            }
        }
    });
}

// Render a single place card
function renderPlaceCard(place, index) {
    // Build status tags
    const tags = [];
    if (place.tags.abandoned === 'yes') tags.push('Abandoned');
    if (place.tags.disused === 'yes') tags.push('Disused');
    if (place.tags.ruins === 'yes') tags.push('Ruins');
    if (place.tags.historic === 'ruins') tags.push('Historic');
    
    // Determine display name
    let displayName = place.name;
    if (!displayName) {
        if (place.address) {
            displayName = place.address.split(',')[0];
        } else if (place.buildingType) {
            displayName = `${place.buildingType.charAt(0).toUpperCase() + place.buildingType.slice(1)} Structure`;
        } else if (place.additionalInfo?.state) {
            displayName = `Abandoned Place (${place.additionalInfo.state})`;
        } else {
            displayName = 'Abandoned Place';
        }
    }
    
    // Get building type
    const placeType = place.buildingType || place.tags.building || place.tags.amenity || place.tags.landuse || 'Structure';
    
    // Build address info
    let addressInfo = '';
    if (place.address) {
        addressInfo = `<p class="result-address">${place.address}</p>`;
    } else if (place.additionalInfo?.state || place.additionalInfo?.country) {
        const locationParts = [];
        if (place.additionalInfo.state) locationParts.push(place.additionalInfo.state);
        if (place.additionalInfo.country) locationParts.push(place.additionalInfo.country);
        if (locationParts.length > 0) {
            addressInfo = `<p class="result-location">${locationParts.join(', ')}</p>`;
        }
    }
    
    // Map links
    const googleMapsUrl = getGoogleMapsUrl(place.lat, place.lon, displayName);
    const bingMapsUrl = getBingMapsUrl(place.lat, place.lon, displayName);
    
    return `
        <div class="result-card">
            <div onclick="focusPlace(${place.lat}, ${place.lon})" style="cursor: pointer;">
                <h3>${displayName}</h3>
                <p class="result-type"><strong>Type:</strong> ${placeType}</p>
                ${addressInfo}
                <div class="result-tags">
                    ${tags.length > 0 ? tags.map(t => `<span class="tag-badge">${t}</span>`).join('') : '<span class="tag-badge">Abandoned</span>'}
                </div>
            </div>
            <div class="result-actions">
                <button class="result-btn result-btn-analyze" onclick="event.stopPropagation(); openInAnalyze('${place.type}', ${place.id})">
                    <i data-lucide="bar-chart-3"></i>
                    Analyze
                </button>
                <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="result-btn result-btn-google" onclick="event.stopPropagation()">
                    <i data-lucide="external-link"></i>
                    Google Maps
                </a>
                <a href="${bingMapsUrl}" target="_blank" rel="noopener noreferrer" class="result-btn result-btn-bing" onclick="event.stopPropagation()">
                    <i data-lucide="external-link"></i>
                    Bing Maps
                </a>
            </div>
        </div>
    `;
}

// Render a group of places as a collapsible dropdown
function renderPlaceGroup(group, groupIndex) {
    const placesHtml = group.places.map(place => {
        // Build status tags
        const tags = [];
        if (place.tags.abandoned === 'yes') tags.push('Abandoned');
        if (place.tags.disused === 'yes') tags.push('Disused');
        if (place.tags.ruins === 'yes') tags.push('Ruins');
        if (place.tags.historic === 'ruins') tags.push('Historic');
        
        // Determine display name
        let displayName = place.name;
        if (!displayName) {
            if (place.address) {
                displayName = place.address.split(',')[0];
            } else if (place.buildingType) {
                displayName = `${place.buildingType.charAt(0).toUpperCase() + place.buildingType.slice(1)} Structure`;
            } else {
                displayName = 'Abandoned Place';
            }
        }
        
        const placeType = place.buildingType || place.tags.building || place.tags.amenity || place.tags.landuse || 'Structure';
        
        let addressInfo = '';
        if (place.address) {
            addressInfo = `<p class="result-address">${place.address}</p>`;
        }
        
        const googleMapsUrl = getGoogleMapsUrl(place.lat, place.lon, displayName);
        const bingMapsUrl = getBingMapsUrl(place.lat, place.lon, displayName);
        
        return `
            <div class="result-card result-card-nested">
                <div onclick="focusPlace(${place.lat}, ${place.lon})" style="cursor: pointer;">
                    <h4>${displayName}</h4>
                    <p class="result-type"><strong>Type:</strong> ${placeType}</p>
                    ${addressInfo}
                    <div class="result-tags">
                        ${tags.length > 0 ? tags.map(t => `<span class="tag-badge">${t}</span>`).join('') : '<span class="tag-badge">Abandoned</span>'}
                    </div>
                </div>
                <div class="result-actions">
                    <button class="result-btn result-btn-analyze" onclick="event.stopPropagation(); openInAnalyze('${place.type}', ${place.id})">
                        <i data-lucide="bar-chart-3"></i>
                        Analyze
                    </button>
                    <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="result-btn result-btn-google" onclick="event.stopPropagation()">
                        <i data-lucide="external-link"></i>
                        Google Maps
                    </a>
                    <a href="${bingMapsUrl}" target="_blank" rel="noopener noreferrer" class="result-btn result-btn-bing" onclick="event.stopPropagation()">
                        <i data-lucide="external-link"></i>
                        Bing Maps
                    </a>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="result-group">
            <button class="result-group-header" id="group-toggle-${groupIndex}" onclick="focusPlace(${group.centerLat}, ${group.centerLon})">
                <i data-lucide="chevron-down"></i>
                <span class="group-name">${group.name}</span>
                <span class="group-count">${group.places.length} places</span>
            </button>
            <div class="result-group-content" id="group-content-${groupIndex}">
                ${placesHtml}
            </div>
        </div>
    `;
}

// Focus on a place when clicked from results
window.focusPlace = function(lat, lon) {
    map.setView([lat, lon], 17);
    markers.forEach(m => {
        const pos = m.getLatLng();
        if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lon) < 0.0001) {
            m.openPopup();
        }
    });
    // On mobile, collapse sidebar when a result is clicked
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
};

// Handle map click
function handleMapClick(e) {
    const searchType = document.getElementById('searchType').value;
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    if (searchType === 'radius') {
        // Set center point for radius search
        clearRadiusCenter();
        document.getElementById('latInput').value = lat.toFixed(6);
        document.getElementById('lonInput').value = lon.toFixed(6);
        
        // Add marker for center point
        radiusCenterMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'radius-center-marker',
                html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
                iconSize: [20, 20]
            })
        }).addTo(map);
        
        // Update circle preview if radius is set (only if no results showing)
        const radius = parseFloat(document.getElementById('radiusInputField').value);
        if (!isNaN(radius) && radius > 0 && markers.length === 0) {
            if (searchAreaLayer) map.removeLayer(searchAreaLayer);
            searchAreaLayer = L.circle([lat, lon], {
                radius: radius * 1000,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(map);
        }
        
        showStatus(`Center point set: ${lat.toFixed(6)}, ${lon.toFixed(6)}`, 'info');
        
    } else if (searchType === 'polygon') {
        // Add point to polygon
        polygonPoints.push({ lat, lon });
        updatePolygonTextarea();
        updatePolygonPreview();
        showStatus(`Point ${polygonPoints.length} added`, 'info');
    }
}

// Handle search type change
function handleSearchTypeChange() {
    const searchType = document.getElementById('searchType').value;
    
    // Clear previous click data
    clearPolygonPoints();
    clearRadiusCenter();
    if (searchAreaLayer) {
        map.removeLayer(searchAreaLayer);
        searchAreaLayer = null;
    }
    
    document.getElementById('cityInput').style.display = searchType === 'city' ? 'block' : 'none';
    document.getElementById('radiusInput').style.display = searchType === 'radius' ? 'block' : 'none';
    document.getElementById('polygonInput').style.display = searchType === 'polygon' ? 'block' : 'none';
    
    // Update map cursor
    if (searchType === 'radius' || searchType === 'polygon') {
        map.getContainer().style.cursor = 'crosshair';
        isClickModeActive = true;
    } else {
        map.getContainer().style.cursor = '';
        isClickModeActive = false;
    }
    
    lucide.createIcons();
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openSidebar');
    sidebar.classList.toggle('collapsed');
    openBtn.style.display = sidebar.classList.contains('collapsed') ? 'flex' : 'none';
}

// Event listeners
document.getElementById('searchType').addEventListener('change', handleSearchTypeChange);
document.getElementById('searchBtn').addEventListener('click', searchAbandonedPlaces);
document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
document.getElementById('openSidebar').addEventListener('click', toggleSidebar);
document.getElementById('clearPolygonBtn').addEventListener('click', clearPolygonPoints);
document.getElementById('basemapSelect').addEventListener('change', (e) => {
    switchBasemap(e.target.value);
});

// Filter toggle functionality
document.getElementById('filterToggle').addEventListener('click', () => {
    const filterContent = document.getElementById('filterContent');
    const filterIcon = document.getElementById('filterIcon');
    const isExpanded = !filterContent.classList.contains('collapsed');
    
    if (isExpanded) {
        filterContent.classList.add('collapsed');
        filterContent.style.display = 'none';
        filterIcon.setAttribute('data-lucide', 'chevron-right');
    } else {
        filterContent.classList.remove('collapsed');
        filterContent.style.display = 'flex';
        filterIcon.setAttribute('data-lucide', 'chevron-down');
    }
    lucide.createIcons();
});

// Filter group toggle functionality - set up after DOM and Lucide are ready
function setupFilterGroupToggles() {
    document.querySelectorAll('.filter-group-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking on the checkbox
            if (e.target.closest('.group-checkbox')) return;
            
            const groupName = header.getAttribute('data-group');
            const content = document.querySelector(`[data-group-content="${groupName}"]`);
            const icon = header.querySelector('i[data-lucide]');
            
            if (!content) return;
            
            const isExpanded = !content.classList.contains('collapsed');
            
            if (isExpanded) {
                content.classList.add('collapsed');
                content.style.display = 'none';
                if (icon) icon.setAttribute('data-lucide', 'chevron-right');
            } else {
                content.classList.remove('collapsed');
                content.style.display = 'flex';
                if (icon) icon.setAttribute('data-lucide', 'chevron-down');
            }
            lucide.createIcons();
        });
    });
}

// Set up filter group toggles after initialization
setupFilterGroupToggles();

// Group checkbox functionality - toggle all items in group
document.querySelectorAll('.group-checkbox input').forEach(groupCheckbox => {
    groupCheckbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const groupName = groupCheckbox.getAttribute('data-group');
        const isChecked = groupCheckbox.checked;
        
        // Toggle all checkboxes in this group
        document.querySelectorAll(`input[data-group="${groupName}"]:not(.group-checkbox input)`).forEach(checkbox => {
            checkbox.checked = isChecked;
        });
    });
});

// Individual checkbox change - update group checkbox state
document.querySelectorAll('input[type="checkbox"][data-group]:not(.group-checkbox input)').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const groupName = checkbox.getAttribute('data-group');
        const groupCheckbox = document.querySelector(`.group-checkbox input[data-group="${groupName}"]`);
        const groupCheckboxes = document.querySelectorAll(`input[data-group="${groupName}"]:not(.group-checkbox input)`);
        const allChecked = Array.from(groupCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(groupCheckboxes).some(cb => cb.checked);
        
        groupCheckbox.checked = allChecked;
        groupCheckbox.indeterminate = someChecked && !allChecked;
    });
});

// Grouping toggle - reapply grouping if results exist
document.getElementById('enableGrouping').addEventListener('change', () => {
    // If we have existing results, reapply grouping
    if (placeGroups && placeGroups.length > 0) {
        const enableGrouping = document.getElementById('enableGrouping').checked;
        const sortSection = document.getElementById('sortSection');
        const allPlaces = [];
        placeGroups.forEach(group => {
            allPlaces.push(...group.places);
        });
        
        // Show/hide sort section
        if (enableGrouping) {
            sortSection.style.display = 'none';
        } else {
            sortSection.style.display = 'block';
        }
        
        if (enableGrouping) {
            placeGroups = groupPlacesByProximity(allPlaces, 150);
        } else {
            // Apply current sort when disabling grouping
            const sortBy = document.getElementById('sortSelect').value;
            const mapCenter = map.getCenter();
            const sortedPlaces = sortPlaces(allPlaces, sortBy, { lat: mapCenter.lat, lon: mapCenter.lng });
            
            placeGroups = sortedPlaces.map((place, index) => ({
                id: index,
                places: [place],
                centerLat: place.lat,
                centerLon: place.lon,
                name: place.name || 'Location'
            }));
        }
        
        // Update map and display
        updateMapClusters(placeGroups, enableGrouping);
        displayResults(allPlaces, placeGroups);
    }
});

// Sort selector - reapply sorting when changed (only when grouping is disabled)
document.getElementById('sortSelect').addEventListener('change', () => {
    const enableGrouping = document.getElementById('enableGrouping').checked;
    if (!enableGrouping && placeGroups && placeGroups.length > 0) {
        const allPlaces = [];
        placeGroups.forEach(group => {
            allPlaces.push(...group.places);
        });
        
        const sortBy = document.getElementById('sortSelect').value;
        const mapCenter = map.getCenter();
        const sortedPlaces = sortPlaces(allPlaces, sortBy, { lat: mapCenter.lat, lon: mapCenter.lng });
        
        placeGroups = sortedPlaces.map((place, index) => ({
            id: index,
            places: [place],
            centerLat: place.lat,
            centerLon: place.lon,
            name: place.name || 'Location'
        }));
        
        displayResults(allPlaces, placeGroups);
    }
});

// Tool navigation
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        switchTool(tool);
    });
});

function switchTool(tool) {
    currentTool = tool;
    
    // Update active state
    document.querySelectorAll('.tool-btn').forEach(btn => {
        if (btn.getAttribute('data-tool') === tool) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide tool content
    const sidebar = document.getElementById('sidebar');
    const analyzeContainer = document.getElementById('analyzeContainer');
    const mainContent = document.querySelector('.main-content');
    
    if (tool === 'search') {
        sidebar.style.display = 'flex';
        if (analyzeContainer) analyzeContainer.style.display = 'none';
        mainContent.style.display = 'block';
    } else if (tool === 'analyze') {
        sidebar.style.display = 'none';
        mainContent.style.display = 'none';
        if (analyzeContainer) analyzeContainer.style.display = 'flex';
    } else {
        // For future tools, hide all sidebars
        sidebar.style.display = 'none';
        mainContent.style.display = 'block';
        if (analyzeContainer) analyzeContainer.style.display = 'none';
    }
    
    lucide.createIcons();
}

// Open a place in the Analyze tool
window.openInAnalyze = function(osmType, osmId) {
    // Switch to analyze tool
    switchTool('analyze');
    
    // Set the OSM type and ID
    const typeSelect = document.getElementById('osmType');
    const idInput = document.getElementById('osmId');
    
    if (typeSelect && idInput) {
        typeSelect.value = osmType;
        idInput.value = osmId;
        
        // Trigger analysis after a short delay to ensure UI is ready
        setTimeout(() => {
            analyzeLocation();
        }, 100);
    }
}

// Analyze location by OSM ID
async function analyzeLocation() {
    const osmType = document.getElementById('osmType').value;
    const osmId = document.getElementById('osmId').value;
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeResults = document.getElementById('analyzeResults');
    const analyzeLoading = document.getElementById('analyzeLoading');
    
    if (!osmId || !osmId.trim()) {
        showAnalyzeError('Please enter an OSM ID');
        return;
    }
    
    const id = parseInt(osmId.trim());
    if (isNaN(id) || id <= 0) {
        showAnalyzeError('Please enter a valid OSM ID (positive number)');
        return;
    }
    
    // Show loading state
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i data-lucide="loader-2"></i> Analyzing...';
    analyzeLoading.style.display = 'flex';
    analyzeResults.style.display = 'none';
    lucide.createIcons();
    
    try {
        console.log(`🔍 [Analyze] Analyzing ${osmType}/${id}...`);
        
        const apiUrl = `/api/analyze?type=${osmType}&id=${id}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 [Analyze] Received data:', data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayAnalyzeResults(data);
        
    } catch (error) {
        console.error('❌ [Analyze Error]', error);
        showAnalyzeError(error.message || 'Failed to analyze location');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i data-lucide="search"></i> Analyze Location';
        analyzeLoading.style.display = 'none';
        lucide.createIcons();
    }
}

function displayAnalyzeResults(data) {
    const analyzeResults = document.getElementById('analyzeResults');
    analyzeResults.style.display = 'block';
    
    const element = data.element;
    if (!element) {
        showAnalyzeError('No data found for this OSM ID');
        return;
    }
    
    let html = '';
    
    // Basic Information
    html += `
        <div class="analyze-section">
            <h2><i data-lucide="info"></i>Basic Information</h2>
            <div class="analyze-info-grid">
                <div class="analyze-info-item">
                    <span class="analyze-info-label">OSM ID</span>
                    <span class="analyze-info-value">
                        <a href="https://www.openstreetmap.org/${element.type}/${element.id}" target="_blank" rel="noopener noreferrer">
                            ${element.type}/${element.id}
                        </a>
                    </span>
                </div>
                <div class="analyze-info-item">
                    <span class="analyze-info-label">Type</span>
                    <span class="analyze-info-value">${element.type}</span>
                </div>
    `;
    
    if (element.lat && element.lon) {
        html += `
                <div class="analyze-info-item">
                    <span class="analyze-info-label">Coordinates</span>
                    <span class="analyze-info-value">${element.lat.toFixed(6)}, ${element.lon.toFixed(6)}</span>
                </div>
                <div class="analyze-info-item">
                    <span class="analyze-info-label">Links</span>
                    <span class="analyze-info-value">
                        <a href="https://www.google.com/maps?q=${element.lat},${element.lon}" target="_blank" rel="noopener noreferrer">Google Maps</a> | 
                        <a href="https://www.bing.com/maps?q=${element.lat},${element.lon}" target="_blank" rel="noopener noreferrer">Bing Maps</a>
                    </span>
                </div>
        `;
    }
    
    html += `</div></div>`;
    
    // Name and Description
    if (element.name || element.description) {
        html += `
            <div class="analyze-section">
                <h2><i data-lucide="tag"></i>Name & Description</h2>
                <div class="analyze-info-grid">
        `;
        if (element.name) {
            html += `
                    <div class="analyze-info-item">
                        <span class="analyze-info-label">Name</span>
                        <span class="analyze-info-value">${escapeHtml(element.name)}</span>
                    </div>
            `;
        }
        if (element.description) {
            html += `
                    <div class="analyze-info-item" style="grid-column: 1 / -1;">
                        <span class="analyze-info-label">Description</span>
                        <span class="analyze-info-value">${escapeHtml(element.description)}</span>
                    </div>
            `;
        }
        html += `</div></div>`;
    }
    
    // Address Information
    if (element.address) {
        html += `
            <div class="analyze-section">
                <h2><i data-lucide="map-pin"></i>Address</h2>
                <div class="analyze-info-grid">
        `;
        Object.entries(element.address).forEach(([key, value]) => {
            if (value) {
                html += `
                    <div class="analyze-info-item">
                        <span class="analyze-info-label">${key.replace('addr:', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span class="analyze-info-value">${escapeHtml(value)}</span>
                    </div>
                `;
            }
        });
        html += `</div></div>`;
    }
    
    // Building Information
    if (element.building) {
        html += `
            <div class="analyze-section">
                <h2><i data-lucide="building"></i>Building Information</h2>
                <div class="analyze-info-grid">
        `;
        Object.entries(element.building).forEach(([key, value]) => {
            if (value) {
                html += `
                    <div class="analyze-info-item">
                        <span class="analyze-info-label">${key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span class="analyze-info-value">${escapeHtml(value)}</span>
                    </div>
                `;
            }
        });
        html += `</div></div>`;
    }
    
    // External Links
    if (element.wikipedia || element.wikidata) {
        html += `
            <div class="analyze-section">
                <h2><i data-lucide="external-link"></i>External Links</h2>
                <div class="analyze-info-grid">
        `;
        if (element.wikipedia) {
            const wikiParts = element.wikipedia.split(':');
            const wikiUrl = `https://${wikiParts[0]}.wikipedia.org/wiki/${encodeURIComponent(wikiParts.slice(1).join(':'))}`;
            html += `
                    <div class="analyze-info-item">
                        <span class="analyze-info-label">Wikipedia</span>
                        <span class="analyze-info-value">
                            <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(element.wikipedia)}</a>
                        </span>
                    </div>
            `;
        }
        if (element.wikidata) {
            html += `
                    <div class="analyze-info-item">
                        <span class="analyze-info-label">Wikidata</span>
                        <span class="analyze-info-value">
                            <a href="https://www.wikidata.org/wiki/${element.wikidata}" target="_blank" rel="noopener noreferrer">${element.wikidata}</a>
                        </span>
                    </div>
            `;
        }
        html += `</div></div>`;
    }
    
    // All Tags
    if (element.tags && Object.keys(element.tags).length > 0) {
        html += `
            <div class="analyze-section">
                <h2><i data-lucide="tags"></i>All Tags (${Object.keys(element.tags).length})</h2>
                <div class="analyze-tags">
        `;
        Object.entries(element.tags).sort().forEach(([key, value]) => {
            html += `
                    <div class="analyze-tag">
                        <span class="analyze-tag-key">${escapeHtml(key)}</span>
                        <span class="analyze-tag-value">${escapeHtml(value)}</span>
                    </div>
            `;
        });
        html += `</div></div>`;
    }
    
    analyzeResults.innerHTML = html;
    lucide.createIcons();
}

function showAnalyzeError(message) {
    const analyzeResults = document.getElementById('analyzeResults');
    analyzeResults.style.display = 'block';
    analyzeResults.innerHTML = `
        <div class="analyze-error">
            <i data-lucide="alert-circle"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    lucide.createIcons();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update radius preview when radius changes
document.getElementById('radiusInputField').addEventListener('input', (e) => {
    const lat = parseFloat(document.getElementById('latInput').value);
    const lon = parseFloat(document.getElementById('lonInput').value);
    const radius = parseFloat(e.target.value);
    
    // Only update preview if we have coordinates and no results are showing
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(radius) && radius > 0 && markers.length === 0) {
        if (searchAreaLayer) map.removeLayer(searchAreaLayer);
        searchAreaLayer = L.circle([lat, lon], {
            radius: radius * 1000,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5'
        }).addTo(map);
    }
});

// Update polygon preview when textarea changes
document.getElementById('polygonTextarea').addEventListener('input', (e) => {
    const text = e.target.value.trim();
    if (text) {
        try {
            const coords = parsePolygonCoordinates(text);
            polygonPoints = coords;
            updatePolygonPreview();
            document.getElementById('polygonPointCount').textContent = `${polygonPoints.length} points`;
        } catch (err) {
            // Invalid input, ignore for now
        }
    } else {
        clearPolygonPoints();
    }
});

// Handle Enter key in inputs
document.getElementById('areaInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

document.getElementById('latInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

document.getElementById('lonInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

document.getElementById('radiusInputField').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

// Analyze button event listener
const analyzeBtn = document.getElementById('analyzeBtn');
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeLocation);
}

const osmIdInput = document.getElementById('osmId');
if (osmIdInput) {
    osmIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            analyzeLocation();
        }
    });
}

// Initialize map and UI on load
initMap();
handleSearchTypeChange();

// Add map click handler
map.on('click', handleMapClick);

lucide.createIcons();