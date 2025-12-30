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
        // Query Overpass API for the specific element
        // Using out meta to get full element details including tags and coordinates
        const query = `[out:json][timeout:30];
${type}(${id});
out center meta;
`;
        
        console.log('📝 [Analyze API] Query:', query);
        
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        console.log('🌐 [Analyze API] Sending query to Overpass API...');
        
        const overpassResponse = await fetch(overpassUrl, {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        
        const overpassDuration = Date.now() - requestStartTime;
        
        if (!overpassResponse.ok) {
            const errorText = await overpassResponse.text();
            console.error('❌ [Analyze API] Overpass error:', overpassResponse.status, overpassResponse.statusText);
            console.error('❌ [Analyze API] Error response:', errorText);
            throw new Error(`Overpass API error: ${overpassResponse.statusText}`);
        }
        
        console.log(`⏱️  [Analyze API] Response received in ${overpassDuration}ms`);
        const overpassData = await overpassResponse.json();
        
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
        
        const totalDuration = Date.now() - requestStartTime;
        console.log(`✨ [Analyze API] Analysis complete (total time: ${totalDuration}ms)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return new Response(JSON.stringify({ 
            element: processedElement,
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

