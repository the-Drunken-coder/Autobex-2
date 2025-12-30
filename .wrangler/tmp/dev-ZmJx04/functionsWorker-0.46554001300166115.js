var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-Uq6itb/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-Uq6itb/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// .wrangler/tmp/pages-GR00pS/functionsWorker-0.46554001300166115.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var urls2 = /* @__PURE__ */ new Set();
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL2, "checkURL");
__name2(checkURL2, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL2(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});
function stripCfConnectingIPHeader2(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
__name2(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader2.apply(null, argArray)
    ]);
  }
});
async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");
  console.log("\u{1F50D} [Analyze API] Request received:", { type, id });
  if (!type || !["node", "way", "relation"].includes(type)) {
    console.error("\u274C [Analyze API] Invalid type:", type);
    return new Response(JSON.stringify({ error: "Invalid type. Must be node, way, or relation" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
    console.error("\u274C [Analyze API] Invalid ID:", id);
    return new Response(JSON.stringify({ error: "Invalid ID. Must be a positive number" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  const requestStartTime = Date.now();
  try {
    const query = `[out:json][timeout:30];
${type}(${id});
out center meta;
`;
    console.log("\u{1F4DD} [Analyze API] Query:", query);
    const overpassUrl = "https://overpass-api.de/api/interpreter";
    console.log("\u{1F310} [Analyze API] Sending query to Overpass API...");
    const overpassResponse = await fetch(overpassUrl, {
      method: "POST",
      body: query,
      headers: {
        "Content-Type": "text/plain"
      }
    });
    const overpassDuration = Date.now() - requestStartTime;
    if (!overpassResponse.ok) {
      const errorText = await overpassResponse.text();
      console.error("\u274C [Analyze API] Overpass error:", overpassResponse.status, overpassResponse.statusText);
      console.error("\u274C [Analyze API] Error response:", errorText);
      throw new Error(`Overpass API error: ${overpassResponse.statusText}`);
    }
    console.log(`\u23F1\uFE0F  [Analyze API] Response received in ${overpassDuration}ms`);
    const overpassData = await overpassResponse.json();
    if (!overpassData.elements || overpassData.elements.length === 0) {
      console.error("\u274C [Analyze API] No element found with ID:", id);
      return new Response(JSON.stringify({
        error: `No ${type} found with ID ${id}`,
        element: null
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const element = overpassData.elements[0];
    console.log("\u{1F4E6} [Analyze API] Element found:", {
      type: element.type,
      id: element.id,
      tagsCount: element.tags ? Object.keys(element.tags).length : 0
    });
    const processedElement = {
      id: element.id,
      type: element.type,
      lat: element.lat || (element.center ? element.center.lat : null),
      lon: element.lon || (element.center ? element.center.lon : null),
      tags: element.tags || {}
    };
    processedElement.name = element.tags?.name || element.tags?.["name:en"] || element.tags?.["name:local"] || element.tags?.["addr:housename"] || null;
    processedElement.description = element.tags?.description || element.tags?.["description:en"] || element.tags?.note || null;
    const address = {};
    const addressKeys = [
      "addr:housenumber",
      "addr:street",
      "addr:city",
      "addr:postcode",
      "addr:state",
      "addr:country",
      "addr:suburb",
      "addr:district",
      "addr:province"
    ];
    addressKeys.forEach((key) => {
      if (element.tags?.[key]) {
        address[key] = element.tags[key];
      }
    });
    if (Object.keys(address).length > 0) {
      processedElement.address = address;
    }
    const building = {};
    const buildingKeys = [
      "building",
      "building:use",
      "building:levels",
      "building:material",
      "building:roof",
      "building:condition",
      "building:part",
      "roof:material",
      "roof:shape",
      "roof:colour"
    ];
    buildingKeys.forEach((key) => {
      if (element.tags?.[key]) {
        building[key] = element.tags[key];
      }
    });
    if (Object.keys(building).length > 0) {
      processedElement.building = building;
    }
    if (element.tags?.wikipedia) {
      processedElement.wikipedia = element.tags.wikipedia;
    }
    if (element.tags?.wikidata) {
      processedElement.wikidata = element.tags.wikidata;
    }
    const additionalInfo = {};
    const usefulTags = [
      "amenity",
      "shop",
      "leisure",
      "tourism",
      "historic",
      "landuse",
      "natural",
      "railway",
      "aeroway",
      "highway",
      "abandoned",
      "disused",
      "ruins",
      "access",
      "operator",
      "opening_hours",
      "phone",
      "website",
      "email"
    ];
    usefulTags.forEach((key) => {
      if (element.tags?.[key]) {
        additionalInfo[key] = element.tags[key];
      }
    });
    if (Object.keys(additionalInfo).length > 0) {
      processedElement.additionalInfo = additionalInfo;
    }
    const totalDuration = Date.now() - requestStartTime;
    console.log(`\u2728 [Analyze API] Analysis complete (total time: ${totalDuration}ms)`);
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    return new Response(JSON.stringify({
      element: processedElement,
      success: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("\u274C [Analyze API Error]", error);
    console.error("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    return new Response(JSON.stringify({
      error: error.message || "An error occurred while analyzing the location",
      element: null
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
async function onRequestGet2(context) {
  const { request } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const filters = {
    abandoned: url.searchParams.get("abandoned") !== "false",
    disused: url.searchParams.get("disused") !== "false",
    ruinsYes: url.searchParams.get("ruinsYes") !== "false",
    historicRuins: url.searchParams.get("historicRuins") !== "false",
    railwayAbandoned: url.searchParams.get("railwayAbandoned") !== "false",
    railwayDisused: url.searchParams.get("railwayDisused") !== "false",
    disusedRailwayStation: url.searchParams.get("disusedRailwayStation") !== "false",
    abandonedRailwayStation: url.searchParams.get("abandonedRailwayStation") !== "false",
    buildingConditionRuinous: url.searchParams.get("buildingConditionRuinous") !== "false",
    buildingRuins: url.searchParams.get("buildingRuins") !== "false",
    disusedAmenity: url.searchParams.get("disusedAmenity") !== "false",
    abandonedAmenity: url.searchParams.get("abandonedAmenity") !== "false",
    disusedShop: url.searchParams.get("disusedShop") !== "false",
    abandonedShop: url.searchParams.get("abandonedShop") !== "false",
    shopVacant: url.searchParams.get("shopVacant") !== "false",
    landuseBrownfield: url.searchParams.get("landuseBrownfield") !== "false",
    disusedAeroway: url.searchParams.get("disusedAeroway") !== "false",
    abandonedAeroway: url.searchParams.get("abandonedAeroway") !== "false"
  };
  console.log("\u{1F50D} [AutoBex 2 API] Request received:", { type, filters });
  if (!type || !["city", "radius", "polygon"].includes(type)) {
    console.error("\u274C [API] Invalid search type:", type);
    return new Response(JSON.stringify({ error: "Invalid search type. Must be city, radius, or polygon" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  const requestStartTime = Date.now();
  try {
    let bbox = null;
    let polygonCoords = null;
    let searchArea = null;
    let overpassStartTime = null;
    if (type === "city") {
      const area = url.searchParams.get("area");
      if (!area) {
        console.error("\u274C [API] Missing area parameter");
        return new Response(JSON.stringify({ error: "Area parameter is required for city search" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      console.log("\u{1F3D9}\uFE0F  [Geocoding] Looking up area:", area);
      const geocodeStartTime = Date.now();
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(area)}&format=json&limit=1`;
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          "User-Agent": "AutoBex2/1.0"
        }
      });
      const geocodeDuration = Date.now() - geocodeStartTime;
      const geocodeData = await geocodeResponse.json();
      if (!geocodeData || geocodeData.length === 0) {
        console.warn("\u26A0\uFE0F  [Geocoding] No results found for:", area);
        return new Response(JSON.stringify({
          error: "Could not find the specified area",
          places: []
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      bbox = geocodeData[0].boundingbox.map(parseFloat);
      searchArea = { bbox };
      console.log(`\u2705 [Geocoding] Found area in ${geocodeDuration}ms, bbox:`, bbox);
    } else if (type === "radius") {
      const lat = parseFloat(url.searchParams.get("lat"));
      const lon = parseFloat(url.searchParams.get("lon"));
      const radius = parseFloat(url.searchParams.get("radius"));
      console.log("\u{1F4CD} [Radius] Processing:", { lat, lon, radius: `${radius}km` });
      if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
        console.error("\u274C [Radius] Invalid coordinates or radius");
        return new Response(JSON.stringify({ error: "Invalid coordinates or radius" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.error("\u274C [Radius] Coordinates out of range");
        return new Response(JSON.stringify({ error: "Coordinates out of valid range" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      if (radius <= 0) {
        console.error("\u274C [Radius] Invalid radius");
        return new Response(JSON.stringify({ error: "Radius must be greater than 0" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      const latDelta = radius / 111;
      const lonDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
      bbox = [
        lat - latDelta,
        // min_lat
        lat + latDelta,
        // max_lat
        lon - lonDelta,
        // min_lon
        lon + lonDelta
        // max_lon
      ];
      searchArea = { lat, lon, radius };
      console.log("\u2705 [Radius] Calculated bbox:", bbox);
    } else if (type === "polygon") {
      const polygonStr = url.searchParams.get("polygon");
      if (!polygonStr) {
        console.error("\u274C [Polygon] Missing polygon parameter");
        return new Response(JSON.stringify({ error: "Polygon parameter is required" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      console.log("\u{1F5FA}\uFE0F  [Polygon] Parsing coordinates...");
      const coords = polygonStr.split(",");
      if (coords.length < 6 || coords.length % 2 !== 0) {
        console.error("\u274C [Polygon] Invalid format, expected even number of coordinates");
        return new Response(JSON.stringify({ error: "Invalid polygon format. Expected lat1,lon1,lat2,lon2,..." }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      polygonCoords = [];
      for (let i = 0; i < coords.length; i += 2) {
        const lat = parseFloat(coords[i]);
        const lon = parseFloat(coords[i + 1]);
        if (isNaN(lat) || isNaN(lon)) {
          console.error(`\u274C [Polygon] Invalid coordinate at position ${i}`);
          return new Response(JSON.stringify({ error: `Invalid coordinate at position ${i}` }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error(`\u274C [Polygon] Coordinate out of range at position ${i}`);
          return new Response(JSON.stringify({ error: `Coordinate out of range at position ${i}` }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        polygonCoords.push({ lat, lon });
      }
      if (polygonCoords.length < 3) {
        console.error("\u274C [Polygon] Not enough points:", polygonCoords.length);
        return new Response(JSON.stringify({ error: "Polygon must have at least 3 points" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      searchArea = { coordinates: polygonCoords };
      console.log(`\u2705 [Polygon] Parsed ${polygonCoords.length} points`);
    }
    console.log("\u{1F528} [Overpass] Building comprehensive query...");
    let query = "[out:json][timeout:60];\n(\n";
    const addBboxQueries = /* @__PURE__ */ __name2((tags, south, west, north, east) => {
      let q = "";
      tags.forEach((tag) => {
        q += `  node[${tag}](${south},${west},${north},${east});
`;
        q += `  way[${tag}](${south},${west},${north},${east});
`;
        q += `  relation[${tag}](${south},${west},${north},${east});
`;
      });
      return q;
    }, "addBboxQueries");
    const addPolygonQueries = /* @__PURE__ */ __name2((tags, polygonStr) => {
      let q = "";
      tags.forEach((tag) => {
        q += `  node[${tag}](poly:"${polygonStr}");
`;
        q += `  way[${tag}](poly:"${polygonStr}");
`;
        q += `  relation[${tag}](poly:"${polygonStr}");
`;
      });
      return q;
    }, "addPolygonQueries");
    const allTags = [];
    if (filters.abandoned)
      allTags.push('"abandoned"="yes"');
    if (filters.disused)
      allTags.push('"disused"="yes"');
    if (filters.ruinsYes)
      allTags.push('"ruins"="yes"');
    if (filters.historicRuins)
      allTags.push('"historic"="ruins"');
    if (filters.railwayAbandoned)
      allTags.push('"railway"="abandoned"');
    if (filters.railwayDisused)
      allTags.push('"railway"="disused"');
    if (filters.disusedRailwayStation)
      allTags.push('"disused:railway"="station"');
    if (filters.abandonedRailwayStation)
      allTags.push('"abandoned:railway"="station"');
    if (filters.buildingConditionRuinous)
      allTags.push('"building:condition"~"^(ruinous|partly_ruinous|mainly_ruinous|completely_ruinous)$"');
    if (filters.buildingRuins)
      allTags.push('"building"="ruins"');
    if (filters.disusedAmenity)
      allTags.push('"disused:amenity"~"."');
    if (filters.abandonedAmenity)
      allTags.push('"abandoned:amenity"~"."');
    if (filters.disusedShop)
      allTags.push('"disused:shop"~"."');
    if (filters.abandonedShop)
      allTags.push('"abandoned:shop"~"."');
    if (filters.shopVacant)
      allTags.push('"shop"="vacant"');
    if (filters.landuseBrownfield)
      allTags.push('"landuse"="brownfield"');
    if (filters.disusedAeroway)
      allTags.push('"disused:aeroway"~"."');
    if (filters.abandonedAeroway)
      allTags.push('"abandoned:aeroway"~"."');
    if (allTags.length === 0) {
      console.error("\u274C [Overpass] No tags selected for query");
      return new Response(JSON.stringify({
        error: "No filters selected. Please select at least one filter option.",
        places: []
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (bbox) {
      const south = parseFloat(bbox[0]);
      const north = parseFloat(bbox[1]);
      const west = parseFloat(bbox[2]);
      const east = parseFloat(bbox[3]);
      console.log("\u{1F4CD} [Overpass] Bbox values:", { south, west, north, east });
      query += addBboxQueries(allTags, south, west, north, east);
    } else if (polygonCoords) {
      const polygonStr = polygonCoords.map((c) => `${c.lat} ${c.lon}`).join(" ");
      query += addPolygonQueries(allTags, polygonStr);
    } else {
      console.error("\u274C [Overpass] No search area defined");
      return new Response(JSON.stringify({
        error: "No search area defined",
        places: []
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    query += ");\n";
    query += "out center meta;";
    console.log("\u{1F4DD} [Overpass] Query built, length:", query.length, "chars");
    console.log("\u{1F4CB} [Overpass] Query filters:", filters);
    console.log("\u{1F4CB} [Overpass] Active tags:", allTags.length);
    console.log("\u{1F4CB} [Overpass] Full query:", query);
    const overpassUrl = "https://overpass-api.de/api/interpreter";
    console.log("\u{1F310} [Overpass] Sending query to Overpass API...");
    overpassStartTime = Date.now();
    const overpassResponse = await fetch(overpassUrl, {
      method: "POST",
      body: query,
      headers: {
        "Content-Type": "text/plain"
      }
    });
    const overpassDuration = Date.now() - overpassStartTime;
    if (!overpassResponse.ok) {
      const errorText = await overpassResponse.text();
      console.error("\u274C [Overpass] API error:", overpassResponse.status, overpassResponse.statusText);
      console.error("\u274C [Overpass] Error response:", errorText);
      console.error("\u274C [Overpass] Full query:", query);
      throw new Error(`Overpass API error: ${overpassResponse.statusText}`);
    }
    console.log(`\u23F1\uFE0F  [Overpass] Response received in ${overpassDuration}ms`);
    const overpassData = await overpassResponse.json();
    const elementCount = overpassData.elements?.length || 0;
    console.log(`\u{1F4E6} [Overpass] Received ${elementCount} elements`);
    console.log("\u{1F504} [Processing] Processing results...");
    const places = [];
    const seenIds = /* @__PURE__ */ new Set();
    if (overpassData.elements) {
      let processed = 0;
      let skipped = 0;
      let filtered = 0;
      overpassData.elements.forEach((element, index) => {
        if (seenIds.has(element.id)) {
          skipped++;
          return;
        }
        if (element.tags && (element.tags.tourism === "attraction" || element.tags.historic === "memorial")) {
          filtered++;
          return;
        }
        seenIds.add(element.id);
        let lat, lon;
        if (element.type === "node") {
          lat = element.lat;
          lon = element.lon;
        } else if (element.center) {
          lat = element.center.lat;
          lon = element.center.lon;
        } else if (element.geometry && element.geometry.length > 0) {
          let sumLat = 0, sumLon = 0;
          element.geometry.forEach((point) => {
            sumLat += point.lat;
            sumLon += point.lon;
          });
          lat = sumLat / element.geometry.length;
          lon = sumLon / element.geometry.length;
        } else {
          skipped++;
          return;
        }
        const name = element.tags.name || element.tags["addr:housename"] || element.tags["name:en"] || element.tags["name:local"] || null;
        const buildingType = element.tags.building || element.tags["building:use"] || element.tags.amenity || element.tags.landuse || element.tags.leisure || null;
        const addressParts = [];
        if (element.tags["addr:housenumber"])
          addressParts.push(element.tags["addr:housenumber"]);
        if (element.tags["addr:street"])
          addressParts.push(element.tags["addr:street"]);
        if (element.tags["addr:city"])
          addressParts.push(element.tags["addr:city"]);
        const address = addressParts.length > 0 ? addressParts.join(" ") : null;
        const additionalInfo = {};
        if (element.tags["addr:postcode"])
          additionalInfo.postcode = element.tags["addr:postcode"];
        if (element.tags["addr:state"])
          additionalInfo.state = element.tags["addr:state"];
        if (element.tags["addr:country"])
          additionalInfo.country = element.tags["addr:country"];
        if (element.tags.wikidata)
          additionalInfo.wikidata = element.tags.wikidata;
        if (element.tags.wikipedia)
          additionalInfo.wikipedia = element.tags.wikipedia;
        places.push({
          id: element.id,
          type: element.type,
          lat,
          lon,
          name,
          buildingType,
          address,
          additionalInfo,
          tags: element.tags
        });
        processed++;
        if ((processed + skipped) % 50 === 0) {
          console.log(`  \u2713 Processed ${processed + skipped}/${elementCount} elements...`);
        }
      });
      console.log(`\u2705 [Processing] Processed ${processed} places, skipped ${skipped} duplicates/invalid, filtered ${filtered} tourist/memorial sites`);
    }
    const totalDuration = Date.now() - requestStartTime;
    console.log(`\u2728 [API Complete] Returning ${places.length} places (total time: ${totalDuration}ms)`);
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    return new Response(JSON.stringify({
      places,
      count: places.length,
      searchArea
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("\u274C [API Error]", error);
    console.error("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    return new Response(JSON.stringify({
      error: error.message || "An error occurred while searching",
      places: []
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
__name(onRequestGet2, "onRequestGet2");
__name2(onRequestGet2, "onRequestGet");
var routes = [
  {
    routePath: "/api/analyze",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/search",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = /* @__PURE__ */ __name(class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
}, "__Facade_ScheduledController__");
__name2(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-Uq6itb/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-Uq6itb/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__2, "__Facade_ScheduledController__");
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.46554001300166115.js.map
