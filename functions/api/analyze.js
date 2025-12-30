function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function parseOSMHistoryXml(xmlText, type) {
    const entries = [];
    const segments = xmlText.split(`<${type}`);
    segments.shift(); // drop any leading content

    segments.forEach(segment => {
        const closingIndex = segment.indexOf(`</${type}>`);
        const selfCloseIndex = segment.indexOf('/>');
        let content = null;

        if (selfCloseIndex !== -1 && (closingIndex === -1 || selfCloseIndex < closingIndex)) {
            content = `<${type}${segment.slice(0, selfCloseIndex + 2)}`;
        } else if (closingIndex !== -1) {
            content = `<${type}${segment.slice(0, closingIndex + (`</${type}>`).length)}`;
        }

        if (!content) return;

        const versionMatch = content.match(/version="([^"]+)"/);
        const timestampMatch = content.match(/timestamp="([^"]+)"/);
        const userMatch = content.match(/user="([^"]+)"/);
        const tags = {};
        const tagRegex = /<tag k="([^"]+)" v="([^"]*)"\/>/g;
        let tagMatch;
        while ((tagMatch = tagRegex.exec(content)) !== null) {
            tags[tagMatch[1]] = tagMatch[2];
        }
        entries.push({
            version: versionMatch ? Number(versionMatch[1]) : null,
            timestamp: timestampMatch ? timestampMatch[1] : null,
            user: userMatch ? userMatch[1] : null,
            tags
        });
    });

    entries.sort((a, b) => (a.version || 0) - (b.version || 0));
    return entries;
}

function summarizeHistory(entries) {
    if (!entries || entries.length === 0) {
        return null;
    }

    const contributors = Array.from(new Set(entries.map(e => e.user).filter(Boolean)));
    const firstMapped = entries[0].timestamp || null;
    const lastEdited = entries[entries.length - 1].timestamp || null;

    let abandonedTagAdded = null;
    const abandonmentKeys = ['abandoned', 'disused', 'ruin', 'ruins'];
    for (const entry of entries) {
        const hasAbandoned = Object.keys(entry.tags || {}).some(key => 
            abandonmentKeys.some(a => key.includes(a)) || (entry.tags[key] && entry.tags[key].includes('abandoned'))
        );
        if (hasAbandoned) {
            abandonedTagAdded = entry.timestamp || entry.version || null;
            break;
        }
    }

    return {
        history: entries,
        firstMapped,
        lastEdited,
        abandonedTagAdded,
        contributors
    };
}

function isValidCoordinates(lat, lon) {
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

async function fetchOverpass(query) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(overpassUrl, {
        method: 'POST',
        body: query,
        headers: {
            'Content-Type': 'text/plain'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Analyze API] Overpass error:', response.status, response.statusText, errorText);
        throw new Error(`Overpass API error: ${response.statusText}`);
    }

    return response.json();
}

async function findAccessAndDistances(lat, lon) {
    if (!isValidCoordinates(lat, lon)) {
        return {};
    }

    const result = {};

    const parkingQuery = `[out:json][timeout:25];
(
  node["amenity"="parking"](around:2000,${lat},${lon});
  way["amenity"="parking"](around:2000,${lat},${lon});
  node["parking"](around:2000,${lat},${lon});
  way["parking"](around:2000,${lat},${lon});
);
out center 40;`;

    const roadQuery = `[out:json][timeout:25];
(
  way["highway"](around:1200,${lat},${lon});
  node["highway"](around:1200,${lat},${lon});
);
out center 60;`;

    const parkingData = await fetchOverpass(parkingQuery);
    const roadData = await fetchOverpass(roadQuery);

    const mapElement = el => ({
        lat: el.lat || el.center?.lat,
        lon: el.lon || el.center?.lon,
        name: el.tags?.name || el.tags?.ref || null,
        tags: el.tags || {}
    });

    const parkingCandidates = (parkingData.elements || []).map(mapElement).filter(p => p.lat && p.lon);
    if (parkingCandidates.length > 0) {
        parkingCandidates.forEach(p => p.distance = calculateDistanceMeters(lat, lon, p.lat, p.lon));
        parkingCandidates.sort((a, b) => a.distance - b.distance);
        result.nearestParking = parkingCandidates[0];
    }

    const roadCandidates = (roadData.elements || []).map(mapElement).filter(r => r.lat && r.lon);
    if (roadCandidates.length > 0) {
        roadCandidates.forEach(r => r.distance = calculateDistanceMeters(lat, lon, r.lat, r.lon));
        roadCandidates.sort((a, b) => a.distance - b.distance);
        result.nearestRoad = roadCandidates[0];
        result.accessPoints = roadCandidates.slice(0, 3);
    }

    return result;
}

async function fetchHistoryData(type, id) {
    const historyUrl = `https://www.openstreetmap.org/api/0.6/${type}/${id}/history`;
    const response = await fetch(historyUrl, {
        headers: {
            'Accept': 'application/xml'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('❌ [Analyze API] History fetch error:', response.status, response.statusText, text);
        throw new Error(`OSM history error: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const entries = parseOSMHistoryXml(xmlText, type);
    return summarizeHistory(entries);
}

function buildImageryLinks(lat, lon) {
    if (!isValidCoordinates(lat, lon)) return null;

    return {
        current: {
            provider: 'Google Maps',
            url: `https://www.google.com/maps/@${lat},${lon},18z`
        },
        historical: [
            {
                provider: 'Google Earth Timelapse',
                url: `https://earthengine.google.org/timelapse/#v=${lat},${lon},12,z,0.0,0.0`
            },
            {
                provider: 'USGS EarthExplorer',
                url: `https://earthexplorer.usgs.gov/?ll=${lat},${lon}`
            },
            {
                provider: 'Esri Wayback',
                url: `https://livingatlas.arcgis.com/wayback/#active=wayback&center=${lon},${lat}&level=16`
            }
        ]
    };
}

function buildNewsLinks(name, address, lat, lon) {
    const queryParts = [];
    if (name) queryParts.push(name);
    if (address?.['addr:city']) queryParts.push(address['addr:city']);
    if (address?.['addr:state']) queryParts.push(address['addr:state']);
    if (isValidCoordinates(lat, lon)) queryParts.push(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    const fallbackQuery = isValidCoordinates(lat, lon) ? `${lat},${lon}` : 'abandoned location';
    const query = encodeURIComponent(queryParts.join(' ').trim() || fallbackQuery);

    return {
        current: [
            {
                title: 'Google News Search',
                source: 'Google News',
                url: `https://news.google.com/search?q=${query}`
            },
            {
                title: 'Bing News Search',
                source: 'Bing News',
                url: `https://www.bing.com/news/search?q=${query}`
            }
        ],
        historical: [
            {
                title: 'Chronicling America',
                source: 'Library of Congress',
                url: `https://chroniclingamerica.loc.gov/search/pages/results/?proxtext=${query}`
            },
            {
                title: 'Archive.org',
                source: 'Internet Archive',
                url: `https://archive.org/search?query=${query}`
            }
        ]
    };
}

function buildStreetViewLinks(lat, lon) {
    if (!isValidCoordinates(lat, lon)) return null;

    return {
        google: {
            available: true,
            url: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`
        },
        mapillary: {
            available: true,
            url: `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=18`
        },
        kartaview: {
            available: true,
            url: `https://kartaview.org/map/@${lat},${lon},17z`
        }
    };
}

export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    
    console.log('🔍 [Analyze API] Request received:', { type, id });
    
    // Validate parameters
    if (!type || !['node', 'way', 'relation'].includes(type)) {
        console.error('❌ [Analyze API] Invalid type:', type);
        return new Response(JSON.stringify({ error: 'Invalid type. Must be node, way, or relation' }), {
            status: 400,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
        console.error('❌ [Analyze API] Invalid ID:', id);
        return new Response(JSON.stringify({ error: 'Invalid ID. Must be a positive number' }), {
            status: 400,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    const requestStartTime = Date.now();
    
    try {
        const query = `[out:json][timeout:30];
${type}(${id});
out center meta;
`;
        
        console.log('📝 [Analyze API] Query:', query);
        
        const overpassData = await fetchOverpass(query);
        const overpassDuration = Date.now() - requestStartTime;
        
        if (!overpassData.elements || overpassData.elements.length === 0) {
            console.error('❌ [Analyze API] No element found with ID:', id);
            return new Response(JSON.stringify({ 
                error: `No ${type} found with ID ${id}`,
                element: null
            }), {
                status: 404,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        const element = overpassData.elements[0];
        console.log('📦 [Analyze API] Element found:', {
            type: element.type,
            id: element.id,
            tagsCount: element.tags ? Object.keys(element.tags).length : 0
        });
        
        // Process element data
        const processedElement = {
            id: element.id,
            type: element.type,
            lat: element.lat || (element.center ? element.center.lat : null),
            lon: element.lon || (element.center ? element.center.lon : null),
            tags: element.tags || {}
        };
        
        // Extract name
        processedElement.name = element.tags?.name || 
                                element.tags?.['name:en'] || 
                                element.tags?.['name:local'] ||
                                element.tags?.['addr:housename'] ||
                                null;
        
        // Extract description
        processedElement.description = element.tags?.description ||
                                       element.tags?.['description:en'] ||
                                       element.tags?.note ||
                                       null;
        
        // Extract address information
        const address = {};
        const addressKeys = [
            'addr:housenumber', 'addr:street', 'addr:city', 
            'addr:postcode', 'addr:state', 'addr:country',
            'addr:suburb', 'addr:district', 'addr:province'
        ];
        addressKeys.forEach(key => {
            if (element.tags?.[key]) {
                address[key] = element.tags[key];
            }
        });
        if (Object.keys(address).length > 0) {
            processedElement.address = address;
        }
        
        // Extract building information
        const building = {};
        const buildingKeys = [
            'building', 'building:use', 'building:levels', 'building:material',
            'building:roof', 'building:condition', 'building:part',
            'roof:material', 'roof:shape', 'roof:colour'
        ];
        buildingKeys.forEach(key => {
            if (element.tags?.[key]) {
                building[key] = element.tags[key];
            }
        });
        if (Object.keys(building).length > 0) {
            processedElement.building = building;
        }
        
        // Extract external links
        if (element.tags?.wikipedia) {
            processedElement.wikipedia = element.tags.wikipedia;
        }
        if (element.tags?.wikidata) {
            processedElement.wikidata = element.tags.wikidata;
        }
        
        // Extract additional useful information
        const additionalInfo = {};
        const usefulTags = [
            'amenity', 'shop', 'leisure', 'tourism', 'historic',
            'landuse', 'natural', 'railway', 'aeroway', 'highway',
            'abandoned', 'disused', 'ruins', 'access', 'operator',
            'opening_hours', 'phone', 'website', 'email'
        ];
        usefulTags.forEach(key => {
            if (element.tags?.[key]) {
                additionalInfo[key] = element.tags[key];
            }
        });
        if (Object.keys(additionalInfo).length > 0) {
            processedElement.additionalInfo = additionalInfo;
        }

        let distanceAccess = null;
        if (isValidCoordinates(processedElement.lat, processedElement.lon)) {
            try {
                distanceAccess = await findAccessAndDistances(processedElement.lat, processedElement.lon);
            } catch (error) {
                console.error('❌ [Analyze API] Distance analysis failed', error);
            }
        }

        let history = null;
        try {
            history = await fetchHistoryData(type, id);
        } catch (error) {
            console.error('❌ [Analyze API] History retrieval failed', error);
        }

        const imagery = buildImageryLinks(processedElement.lat, processedElement.lon);
        const news = buildNewsLinks(processedElement.name, processedElement.address, processedElement.lat, processedElement.lon);
        const streetView = buildStreetViewLinks(processedElement.lat, processedElement.lon);
        
        const totalDuration = Date.now() - requestStartTime;
        console.log(`⏱️  [Analyze API] Response received in ${overpassDuration}ms`);
        console.log(`✨ [Analyze API] Analysis complete (total time: ${totalDuration}ms)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return new Response(JSON.stringify({ 
            element: processedElement,
            distanceAccess,
            history,
            imagery,
            news,
            streetView,
            success: true
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        console.error('❌ [Analyze API Error]', error);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return new Response(JSON.stringify({ 
            error: error.message || 'An error occurred while analyzing the location',
            element: null
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

export { calculateDistanceMeters, parseOSMHistoryXml, summarizeHistory, buildImageryLinks, buildNewsLinks, buildStreetViewLinks, isValidCoordinates };
