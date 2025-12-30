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
    const startRegex = new RegExp(`<${type}(?:\\s|>)`, 'g');
    const closeTag = `</${type}>`;
    let match;

    while ((match = startRegex.exec(xmlText)) !== null) {
        const startIndex = match.index;
        const selfCloseIndex = xmlText.indexOf('/>', startIndex);
        const closingIndex = xmlText.indexOf(closeTag, startIndex);
        let endIndex = -1;

        if (selfCloseIndex !== -1 && (closingIndex === -1 || selfCloseIndex < closingIndex)) {
            endIndex = selfCloseIndex + 2;
        } else if (closingIndex !== -1) {
            endIndex = closingIndex + closeTag.length;
        }

        if (endIndex === -1) continue;

        const content = xmlText.slice(startIndex, endIndex);

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

        startRegex.lastIndex = endIndex;
    }

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
            provider: 'Google Street View',
            url: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`
        },
        bing: {
            provider: 'Bing Streetside',
            url: `https://www.bing.com/maps?cp=${lat}~${lon}&style=x&lvl=19`
        }
    };
}

function buildHistoryChanges(entries) {
    const changes = [];
    for (let i = 1; i < entries.length; i++) {
        const prev = entries[i - 1].tags || {};
        const current = entries[i].tags || {};
        const added = [];
        const removed = [];
        const changed = [];

        Object.keys(current).forEach(key => {
            if (!(key in prev)) {
                added.push({ key, value: current[key] });
            } else if (prev[key] !== current[key]) {
                changed.push({ key, from: prev[key], to: current[key] });
            }
        });

        Object.keys(prev).forEach(key => {
            if (!(key in current)) {
                removed.push({ key, value: prev[key] });
            }
        });

        changes.push({
            version: entries[i].version,
            timestamp: entries[i].timestamp,
            user: entries[i].user,
            added,
            removed,
            changed
        });
    }
    return changes;
}

async function fetchWaybackReleases() {
    try {
        const res = await fetch('https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/VectorTileServer/releases?f=pjson', {
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('Wayback release fetch failed');
        const json = await res.json();
        const releases = (json.releases || json.versions || []).slice(0, 6).map((release, idx) => {
            const id = release.release || release.id || release.name || release.itemId || `release-${idx}`;
            const date = release.releaseDate || release.date || release.release_date || null;
            return {
                id,
                date,
                tileUrl: `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/${id}/default028mm/MapServer/tile/{z}/{y}/{x}`
            };
        });
        return releases;
    } catch (err) {
        console.error('❌ [Analyze API] Failed to fetch Wayback releases', err);
        // Fallback static releases
        return [
            { id: 'default028mm', date: 'Latest', tileUrl: 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/{z}/{y}/{x}' },
            { id: '2017', date: '2017', tileUrl: 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/2017/default028mm/MapServer/tile/{z}/{y}/{x}' },
            { id: '2014', date: '2014', tileUrl: 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/2014/default028mm/MapServer/tile/{z}/{y}/{x}' }
        ];
    }
}

async function fetchNewsArticles(query) {
    const results = {
        current: [],
        historical: []
    };

    if (!query) {
        return results;
    }

    // Google News RSS (recent)
    try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const res = await fetch(rssUrl);
        if (res.ok) {
            const text = await res.text();
            const items = [];
            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            let match;
            while ((match = itemRegex.exec(text)) !== null && items.length < 5) {
                const block = match[1];
                const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
                const linkMatch = block.match(/<link>(.*?)<\/link>/);
                const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
                const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : 'Untitled';
                const link = linkMatch ? linkMatch[1] : '#';
                items.push({
                    title,
                    url: link,
                    date: dateMatch ? dateMatch[1] : null,
                    source: 'Google News'
                });
            }
            results.current = items;
        }
    } catch (err) {
        console.error('❌ [Analyze API] Google News RSS failed', err);
    }

    // Chronicling America (historical)
    try {
        const chroniclingUrl = `https://chroniclingamerica.loc.gov/search/pages/results/?format=json&proxtext=${encodeURIComponent(query)}&rows=5`;
        const res = await fetch(chroniclingUrl, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
            const json = await res.json();
            const items = (json.items || json.items_found || json.itemsReturned || json.articles || json.results || json?.items || []).slice(0, 5);
            const mapped = items.map(item => ({
                title: item.headline || item.title || item.label || 'Article',
                url: item.id || item.url || item['@id'],
                date: item.date || item.created || item.pub_date,
                source: item.publisher || 'Chronicling America',
                snippet: item.snippet || item.text || null
            }));
            results.historical.push(...mapped);
        }
    } catch (err) {
        console.error('❌ [Analyze API] Chronicling America fetch failed', err);
    }

    // Archive.org (historical / mixed)
    try {
        const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&output=json&rows=5`;
        const res = await fetch(archiveUrl, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
            const json = await res.json();
            const docs = json?.response?.docs || [];
            const mapped = docs.slice(0, 5).map(doc => ({
                title: doc.title || 'Archive Item',
                url: `https://archive.org/details/${doc.identifier}`,
                date: doc.date || doc.year,
                source: doc.creator || 'Archive.org',
                snippet: doc.description ? (Array.isArray(doc.description) ? doc.description[0] : doc.description) : null
            }));
            results.historical.push(...mapped);
        }
    } catch (err) {
        console.error('❌ [Analyze API] Archive.org fetch failed', err);
    }

    return results;
}

function buildAccessLines(origin, accessPoints = []) {
    if (!isValidCoordinates(origin.lat, origin.lon)) return [];
    return accessPoints.filter(p => isValidCoordinates(p.lat, p.lon)).map(p => ({
        from: { lat: origin.lat, lon: origin.lon },
        to: { lat: p.lat, lon: p.lon },
        distance: p.distance || calculateDistanceMeters(origin.lat, origin.lon, p.lat, p.lon),
        label: p.name || p.tags?.highway || 'Access'
    }));
}

async function fetchRoute(origin, destination) {
    if (!origin || !destination || !isValidCoordinates(origin.lat, origin.lon) || !isValidCoordinates(destination.lat, destination.lon)) {
        return null;
    }

    const fallback = {
        geometry: {
            coordinates: [
                [origin.lon, origin.lat],
                [destination.lon, destination.lat]
            ]
        },
        distance: calculateDistanceMeters(origin.lat, origin.lon, destination.lat, destination.lon),
        duration: null,
        steps: [],
        summary: 'Direct line (routing unavailable)'
    };

    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('❌ [Analyze API] Routing request failed', res.status, res.statusText);
            return fallback;
        }
        const json = await res.json();
        const route = json?.routes?.[0];
        if (!route) return fallback;

        const leg = route.legs && route.legs[0];
        const steps = (leg?.steps || []).map(step => ({
            distance: step.distance,
            duration: step.duration,
            instruction: step.maneuver?.instruction || step.name || 'Continue',
            name: step.name || ''
        }));

        return {
            geometry: route.geometry,
            distance: route.distance,
            duration: route.duration,
            summary: leg?.summary || 'Route',
            steps
        };
    } catch (err) {
        console.error('❌ [Analyze API] Routing error', err);
        return fallback;
    }
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
            if (history?.history) {
                history.changes = buildHistoryChanges(history.history);
            }
        } catch (error) {
            console.error('❌ [Analyze API] History retrieval failed', error);
        }

        const imageryLinks = buildImageryLinks(processedElement.lat, processedElement.lon);
        let imagery = imageryLinks;
        try {
            const releases = await fetchWaybackReleases();
            imagery = {
                ...imageryLinks,
                waybackReleases: releases
            };
        } catch (err) {
            console.error('❌ [Analyze API] Imagery release fetch failed', err);
        }

        const newsLinks = buildNewsLinks(processedElement.name, processedElement.address, processedElement.lat, processedElement.lon);
        const nativeNews = await fetchNewsArticles(processedElement.name || processedElement.description || (processedElement.address ? Object.values(processedElement.address).join(' ') : '') || `${processedElement.lat},${processedElement.lon}`);
        const news = { ...newsLinks, articles: nativeNews };

        // Routing to nearest access points
        let routing = null;
        if (distanceAccess) {
            const origin = { lat: processedElement.lat, lon: processedElement.lon };
            routing = {};
            if (distanceAccess.nearestParking) {
                routing.parkingRoute = await fetchRoute(origin, distanceAccess.nearestParking);
            }
            if (distanceAccess.nearestRoad) {
                routing.roadRoute = await fetchRoute(origin, distanceAccess.nearestRoad);
            }
            routing.accessLines = buildAccessLines(origin, distanceAccess.accessPoints || []);
        }

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
            routing,
            streetView: buildStreetViewLinks(processedElement.lat, processedElement.lon),
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
