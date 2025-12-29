export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    const type = url.searchParams.get('type');
    
    // Get all filter parameters
    const filters = {
        abandoned: url.searchParams.get('abandoned') !== 'false',
        disused: url.searchParams.get('disused') !== 'false',
        ruinsYes: url.searchParams.get('ruinsYes') !== 'false',
        historicRuins: url.searchParams.get('historicRuins') !== 'false',
        railwayAbandoned: url.searchParams.get('railwayAbandoned') !== 'false',
        railwayDisused: url.searchParams.get('railwayDisused') !== 'false',
        disusedRailwayStation: url.searchParams.get('disusedRailwayStation') !== 'false',
        abandonedRailwayStation: url.searchParams.get('abandonedRailwayStation') !== 'false',
        buildingConditionRuinous: url.searchParams.get('buildingConditionRuinous') !== 'false',
        buildingRuins: url.searchParams.get('buildingRuins') !== 'false',
        disusedAmenity: url.searchParams.get('disusedAmenity') !== 'false',
        abandonedAmenity: url.searchParams.get('abandonedAmenity') !== 'false',
        disusedShop: url.searchParams.get('disusedShop') !== 'false',
        abandonedShop: url.searchParams.get('abandonedShop') !== 'false',
        shopVacant: url.searchParams.get('shopVacant') !== 'false',
        landuseBrownfield: url.searchParams.get('landuseBrownfield') !== 'false',
        disusedAeroway: url.searchParams.get('disusedAeroway') !== 'false',
        abandonedAeroway: url.searchParams.get('abandonedAeroway') !== 'false'
    };
    
    console.log('🔍 [AutoBex 2 API] Request received:', { type, filters });
    
    // Validate search type
    if (!type || !['city', 'radius', 'polygon'].includes(type)) {
        console.error('❌ [API] Invalid search type:', type);
        return new Response(JSON.stringify({ error: 'Invalid search type. Must be city, radius, or polygon' }), {
            status: 400,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    const requestStartTime = Date.now();
    
    try {
        let bbox = null;
        let polygonCoords = null;
        let searchArea = null;
        let overpassStartTime = null;
        
        // Process input based on type
        if (type === 'city') {
            const area = url.searchParams.get('area');
            if (!area) {
                console.error('❌ [API] Missing area parameter');
                return new Response(JSON.stringify({ error: 'Area parameter is required for city search' }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            console.log('🏙️  [Geocoding] Looking up area:', area);
            const geocodeStartTime = Date.now();
            
            // Geocode the area to get bounding box
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(area)}&format=json&limit=1`;
            const geocodeResponse = await fetch(geocodeUrl, {
                headers: {
                    'User-Agent': 'AutoBex2/1.0'
                }
            });
            
            const geocodeDuration = Date.now() - geocodeStartTime;
            const geocodeData = await geocodeResponse.json();
            
            if (!geocodeData || geocodeData.length === 0) {
                console.warn('⚠️  [Geocoding] No results found for:', area);
                return new Response(JSON.stringify({ 
                    error: 'Could not find the specified area',
                    places: []
                }), {
                    status: 200,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            bbox = geocodeData[0].boundingbox.map(parseFloat); // [min_lat, max_lat, min_lon, max_lon] - convert to numbers
            searchArea = { bbox: bbox };
            console.log(`✅ [Geocoding] Found area in ${geocodeDuration}ms, bbox:`, bbox);
            
        } else if (type === 'radius') {
            const lat = parseFloat(url.searchParams.get('lat'));
            const lon = parseFloat(url.searchParams.get('lon'));
            const radius = parseFloat(url.searchParams.get('radius'));
            
            console.log('📍 [Radius] Processing:', { lat, lon, radius: `${radius}km` });
            
            if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
                console.error('❌ [Radius] Invalid coordinates or radius');
                return new Response(JSON.stringify({ error: 'Invalid coordinates or radius' }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                console.error('❌ [Radius] Coordinates out of range');
                return new Response(JSON.stringify({ error: 'Coordinates out of valid range' }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            if (radius <= 0) {
                console.error('❌ [Radius] Invalid radius');
                return new Response(JSON.stringify({ error: 'Radius must be greater than 0' }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            // Calculate bounding box from center and radius
            // Approximate: 1 degree latitude ≈ 111 km
            const latDelta = radius / 111;
            const lonDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
            
            bbox = [
                lat - latDelta,  // min_lat
                lat + latDelta,  // max_lat
                lon - lonDelta,  // min_lon
                lon + lonDelta   // max_lon
            ];
            
            searchArea = { lat, lon, radius };
            console.log('✅ [Radius] Calculated bbox:', bbox);
            
        } else if (type === 'polygon') {
            const polygonStr = url.searchParams.get('polygon');
            if (!polygonStr) {
                console.error('❌ [Polygon] Missing polygon parameter');
                return new Response(JSON.stringify({ error: 'Polygon parameter is required' }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            console.log('🗺️  [Polygon] Parsing coordinates...');
            
            // Parse polygon coordinates
            const coords = polygonStr.split(',');
            if (coords.length < 6 || coords.length % 2 !== 0) {
                console.error('❌ [Polygon] Invalid format, expected even number of coordinates');
                return new Response(JSON.stringify({ error: 'Invalid polygon format. Expected lat1,lon1,lat2,lon2,...' }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            polygonCoords = [];
            for (let i = 0; i < coords.length; i += 2) {
                const lat = parseFloat(coords[i]);
                const lon = parseFloat(coords[i + 1]);
                
                if (isNaN(lat) || isNaN(lon)) {
                    console.error(`❌ [Polygon] Invalid coordinate at position ${i}`);
                    return new Response(JSON.stringify({ error: `Invalid coordinate at position ${i}` }), {
                        status: 400,
                        headers: { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                }
                
                if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    console.error(`❌ [Polygon] Coordinate out of range at position ${i}`);
                    return new Response(JSON.stringify({ error: `Coordinate out of range at position ${i}` }), {
                        status: 400,
                        headers: { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                }
                
                polygonCoords.push({ lat, lon });
            }
            
            if (polygonCoords.length < 3) {
                console.error('❌ [Polygon] Not enough points:', polygonCoords.length);
                return new Response(JSON.stringify({ error: 'Polygon must have at least 3 points' }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            searchArea = { coordinates: polygonCoords };
            console.log(`✅ [Polygon] Parsed ${polygonCoords.length} points`);
        }
        
        // Build Overpass API query with comprehensive tag coverage
        console.log('🔨 [Overpass] Building comprehensive query...');
        let query = '[out:json][timeout:60];\n(\n';
        
        // Helper function to add query lines for bbox
        const addBboxQueries = (tags, south, west, north, east) => {
            let q = '';
            tags.forEach(tag => {
                q += `  node[${tag}](${south},${west},${north},${east});\n`;
                q += `  way[${tag}](${south},${west},${north},${east});\n`;
                q += `  relation[${tag}](${south},${west},${north},${east});\n`;
            });
            return q;
        };
        
        // Helper function to add query lines for polygon
        const addPolygonQueries = (tags, polygonStr) => {
            let q = '';
            tags.forEach(tag => {
                q += `  node[${tag}](poly:"${polygonStr}");\n`;
                q += `  way[${tag}](poly:"${polygonStr}");\n`;
                q += `  relation[${tag}](poly:"${polygonStr}");\n`;
            });
            return q;
        };
        
        // Build tag list based on filter selections
        const allTags = [];
        
        // Basic Status
        if (filters.abandoned) allTags.push('"abandoned"="yes"');
        if (filters.disused) allTags.push('"disused"="yes"');
        
        // Ruins
        if (filters.ruinsYes) allTags.push('"ruins"="yes"');
        if (filters.historicRuins) allTags.push('"historic"="ruins"');
        
        // Railways
        if (filters.railwayAbandoned) allTags.push('"railway"="abandoned"');
        if (filters.railwayDisused) allTags.push('"railway"="disused"');
        if (filters.disusedRailwayStation) allTags.push('"disused:railway"="station"');
        if (filters.abandonedRailwayStation) allTags.push('"abandoned:railway"="station"');
        
        // Buildings
        if (filters.buildingConditionRuinous) allTags.push('"building:condition"~"^(ruinous|partly_ruinous|mainly_ruinous|completely_ruinous)$"');
        if (filters.buildingRuins) allTags.push('"building"="ruins"');
        
        // Amenities - use regex to match any value
        if (filters.disusedAmenity) allTags.push('"disused:amenity"~"."');
        if (filters.abandonedAmenity) allTags.push('"abandoned:amenity"~"."');
        
        // Shops - use regex to match any value
        if (filters.disusedShop) allTags.push('"disused:shop"~"."');
        if (filters.abandonedShop) allTags.push('"abandoned:shop"~"."');
        if (filters.shopVacant) allTags.push('"shop"="vacant"');
        
        // Land Use
        if (filters.landuseBrownfield) allTags.push('"landuse"="brownfield"');
        
        // Aeroways - use regex to match any value
        if (filters.disusedAeroway) allTags.push('"disused:aeroway"~"."');
        if (filters.abandonedAeroway) allTags.push('"abandoned:aeroway"~"."');
        
        // Check if we have any tags to query
        if (allTags.length === 0) {
            console.error('❌ [Overpass] No tags selected for query');
            return new Response(JSON.stringify({ 
                error: 'No filters selected. Please select at least one filter option.',
                places: []
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        if (bbox) {
            // Nominatim bbox format: [min_lat, max_lat, min_lon, max_lon]
            // Overpass expects: (south, west, north, east)
            const south = parseFloat(bbox[0]);
            const north = parseFloat(bbox[1]);
            const west = parseFloat(bbox[2]);
            const east = parseFloat(bbox[3]);
            
            console.log('📍 [Overpass] Bbox values:', { south, west, north, east });
            query += addBboxQueries(allTags, south, west, north, east);
        } else if (polygonCoords) {
            const polygonStr = polygonCoords.map(c => `${c.lat} ${c.lon}`).join(' ');
            query += addPolygonQueries(allTags, polygonStr);
        } else {
            console.error('❌ [Overpass] No search area defined');
            return new Response(JSON.stringify({ 
                error: 'No search area defined',
                places: []
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        query += ');\n';
        query += 'out center meta;';
        
        console.log('📝 [Overpass] Query built, length:', query.length, 'chars');
        console.log('📋 [Overpass] Query filters:', filters);
        console.log('📋 [Overpass] Active tags:', allTags.length);
        console.log('📋 [Overpass] Full query:', query);
        
        // Query Overpass API
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        console.log('🌐 [Overpass] Sending query to Overpass API...');
        overpassStartTime = Date.now();
        
        const overpassResponse = await fetch(overpassUrl, {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        
        const overpassDuration = Date.now() - overpassStartTime;
        
        if (!overpassResponse.ok) {
            const errorText = await overpassResponse.text();
            console.error('❌ [Overpass] API error:', overpassResponse.status, overpassResponse.statusText);
            console.error('❌ [Overpass] Error response:', errorText);
            console.error('❌ [Overpass] Full query:', query);
            throw new Error(`Overpass API error: ${overpassResponse.statusText}`);
        }
        
        console.log(`⏱️  [Overpass] Response received in ${overpassDuration}ms`);
        const overpassData = await overpassResponse.json();
        
        const elementCount = overpassData.elements?.length || 0;
        console.log(`📦 [Overpass] Received ${elementCount} elements`);
        
        // Process results
        console.log('🔄 [Processing] Processing results...');
        const places = [];
        const seenIds = new Set();
        
        if (overpassData.elements) {
            let processed = 0;
            let skipped = 0;
            let filtered = 0;
            
            overpassData.elements.forEach((element, index) => {
                if (seenIds.has(element.id)) {
                    skipped++;
                    return;
                }
                
                // Filter out tourist attractions and memorials to reduce false positives
                if (element.tags && (
                    element.tags.tourism === 'attraction' ||
                    element.tags.historic === 'memorial'
                )) {
                    filtered++;
                    return;
                }
                
                seenIds.add(element.id);
                
                // Get coordinates
                let lat, lon;
                if (element.type === 'node') {
                    lat = element.lat;
                    lon = element.lon;
                } else if (element.center) {
                    lat = element.center.lat;
                    lon = element.center.lon;
                } else if (element.geometry && element.geometry.length > 0) {
                    // Calculate center from geometry
                    let sumLat = 0, sumLon = 0;
                    element.geometry.forEach(point => {
                        sumLat += point.lat;
                        sumLon += point.lon;
                    });
                    lat = sumLat / element.geometry.length;
                    lon = sumLon / element.geometry.length;
                } else {
                    skipped++;
                    return; // Skip if no coordinates
                }
                
                // Extract name with better fallbacks
                const name = element.tags.name || 
                            element.tags['addr:housename'] || 
                            element.tags['name:en'] ||
                            element.tags['name:local'] ||
                            null;
                
                // Extract useful information for display
                const buildingType = element.tags.building || 
                                   element.tags['building:use'] ||
                                   element.tags.amenity ||
                                   element.tags.landuse ||
                                   element.tags.leisure ||
                                   null;
                
                // Build address string
                const addressParts = [];
                if (element.tags['addr:housenumber']) addressParts.push(element.tags['addr:housenumber']);
                if (element.tags['addr:street']) addressParts.push(element.tags['addr:street']);
                if (element.tags['addr:city']) addressParts.push(element.tags['addr:city']);
                const address = addressParts.length > 0 ? addressParts.join(' ') : null;
                
                // Extract additional useful tags
                const additionalInfo = {};
                if (element.tags['addr:postcode']) additionalInfo.postcode = element.tags['addr:postcode'];
                if (element.tags['addr:state']) additionalInfo.state = element.tags['addr:state'];
                if (element.tags['addr:country']) additionalInfo.country = element.tags['addr:country'];
                if (element.tags.wikidata) additionalInfo.wikidata = element.tags.wikidata;
                if (element.tags.wikipedia) additionalInfo.wikipedia = element.tags.wikipedia;
                
                places.push({
                    id: element.id,
                    type: element.type,
                    lat: lat,
                    lon: lon,
                    name: name,
                    buildingType: buildingType,
                    address: address,
                    additionalInfo: additionalInfo,
                    tags: element.tags
                });
                processed++;
                
                if ((processed + skipped) % 50 === 0) {
                    console.log(`  ✓ Processed ${processed + skipped}/${elementCount} elements...`);
                }
            });
            
            console.log(`✅ [Processing] Processed ${processed} places, skipped ${skipped} duplicates/invalid, filtered ${filtered} tourist/memorial sites`);
        }
        
        const totalDuration = Date.now() - requestStartTime;
        console.log(`✨ [API Complete] Returning ${places.length} places (total time: ${totalDuration}ms)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return new Response(JSON.stringify({ 
            places: places,
            count: places.length,
            searchArea: searchArea
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        console.error('❌ [API Error]', error);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return new Response(JSON.stringify({ 
            error: error.message || 'An error occurred while searching',
            places: []
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
