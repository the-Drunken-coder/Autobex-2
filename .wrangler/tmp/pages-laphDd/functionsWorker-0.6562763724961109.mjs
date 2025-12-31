var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-UnyLKd/checked-fetch.js
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

// ../.wrangler/tmp/bundle-UnyLKd/strip-cf-connecting-ip-header.js
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

// api/analyze.js
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
__name(calculateDistanceMeters, "calculateDistanceMeters");
function parseOSMHistoryXml(xmlText, type) {
  const entries = [];
  const startRegex = new RegExp(`<${type}(?:\\s|>)`, "g");
  const closeTag = `</${type}>`;
  let match2;
  while ((match2 = startRegex.exec(xmlText)) !== null) {
    const startIndex = match2.index;
    const selfCloseIndex = xmlText.indexOf("/>", startIndex);
    const closingIndex = xmlText.indexOf(closeTag, startIndex);
    let endIndex = -1;
    if (selfCloseIndex !== -1 && (closingIndex === -1 || selfCloseIndex < closingIndex)) {
      endIndex = selfCloseIndex + 2;
    } else if (closingIndex !== -1) {
      endIndex = closingIndex + closeTag.length;
    }
    if (endIndex === -1)
      continue;
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
__name(parseOSMHistoryXml, "parseOSMHistoryXml");
function summarizeHistory(entries) {
  if (!entries || entries.length === 0) {
    return null;
  }
  const contributors = Array.from(new Set(entries.map((e) => e.user).filter(Boolean)));
  const firstMapped = entries[0].timestamp || null;
  const lastEdited = entries[entries.length - 1].timestamp || null;
  let abandonedTagAdded = null;
  const abandonmentKeys = ["abandoned", "disused", "ruin", "ruins"];
  for (const entry of entries) {
    const hasAbandoned = Object.keys(entry.tags || {}).some(
      (key) => abandonmentKeys.some((a) => key.includes(a)) || entry.tags[key] && entry.tags[key].includes("abandoned")
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
__name(summarizeHistory, "summarizeHistory");
function isValidCoordinates(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
__name(isValidCoordinates, "isValidCoordinates");
async function fetchOverpass(query) {
  const overpassUrl = "https://overpass-api.de/api/interpreter";
  const response = await fetch(overpassUrl, {
    method: "POST",
    body: query,
    headers: {
      "Content-Type": "text/plain"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("\u274C [Analyze API] Overpass error:", response.status, response.statusText, errorText);
    throw new Error(`Overpass API error: ${response.statusText}`);
  }
  return response.json();
}
__name(fetchOverpass, "fetchOverpass");
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
  const mapElement = /* @__PURE__ */ __name((el) => ({
    lat: el.lat || el.center?.lat,
    lon: el.lon || el.center?.lon,
    name: el.tags?.name || el.tags?.ref || null,
    tags: el.tags || {}
  }), "mapElement");
  const parkingCandidates = (parkingData.elements || []).map(mapElement).filter((p) => p.lat && p.lon);
  if (parkingCandidates.length > 0) {
    parkingCandidates.forEach((p) => p.distance = calculateDistanceMeters(lat, lon, p.lat, p.lon));
    parkingCandidates.sort((a, b) => a.distance - b.distance);
    result.nearestParking = parkingCandidates[0];
  }
  const roadCandidates = (roadData.elements || []).map(mapElement).filter((r) => r.lat && r.lon);
  if (roadCandidates.length > 0) {
    roadCandidates.forEach((r) => r.distance = calculateDistanceMeters(lat, lon, r.lat, r.lon));
    roadCandidates.sort((a, b) => a.distance - b.distance);
    result.nearestRoad = roadCandidates[0];
    result.accessPoints = roadCandidates.slice(0, 3);
  }
  return result;
}
__name(findAccessAndDistances, "findAccessAndDistances");
async function fetchHistoryData(type, id) {
  const historyUrl = `https://www.openstreetmap.org/api/0.6/${type}/${id}/history`;
  const response = await fetch(historyUrl, {
    headers: {
      "Accept": "application/xml"
    }
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("\u274C [Analyze API] History fetch error:", response.status, response.statusText, text);
    throw new Error(`OSM history error: ${response.statusText}`);
  }
  const xmlText = await response.text();
  const entries = parseOSMHistoryXml(xmlText, type);
  return summarizeHistory(entries);
}
__name(fetchHistoryData, "fetchHistoryData");
function buildImageryLinks(lat, lon) {
  if (!isValidCoordinates(lat, lon))
    return null;
  return {
    current: {
      provider: "Google Maps",
      url: `https://www.google.com/maps/@${lat},${lon},18z`
    },
    historical: [
      {
        provider: "Google Earth Timelapse",
        url: `https://earthengine.google.org/timelapse/#v=${lat},${lon},12,z,0.0,0.0`
      },
      {
        provider: "USGS EarthExplorer",
        url: `https://earthexplorer.usgs.gov/?ll=${lat},${lon}`
      },
      {
        provider: "Esri Wayback",
        url: `https://livingatlas.arcgis.com/wayback/#active=wayback&center=${lon},${lat}&level=16`
      }
    ]
  };
}
__name(buildImageryLinks, "buildImageryLinks");
function buildStreetViewLinks(lat, lon) {
  if (!isValidCoordinates(lat, lon))
    return null;
  return {
    google: {
      provider: "Google Street View",
      url: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`
    },
    mapillary: {
      provider: "Mapillary",
      url: `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`
    },
    kartaview: {
      provider: "KartaView",
      url: `https://kartaview.org/map/@${lat},${lon},17z`
    }
  };
}
__name(buildStreetViewLinks, "buildStreetViewLinks");
function buildNewsLinks(name, address, lat, lon) {
  const queryParts = [];
  if (name) {
    queryParts.push(`"${name}"`);
  }
  if (address?.["addr:city"])
    queryParts.push(address["addr:city"]);
  if (address?.["addr:state"])
    queryParts.push(address["addr:state"]);
  const fallbackQuery = name || (address ? `${address["addr:city"] || ""} ${address["addr:state"] || ""}`.trim() : "") || "location";
  const query = encodeURIComponent(queryParts.join(" ").trim() || fallbackQuery);
  return {
    current: [
      {
        title: "Google News Search",
        source: "Google News",
        url: `https://news.google.com/search?q=${query}`
      },
      {
        title: "Bing News Search",
        source: "Bing News",
        url: `https://www.bing.com/news/search?q=${query}`
      }
    ],
    historical: [
      {
        title: "Chronicling America",
        source: "Library of Congress",
        url: `https://chroniclingamerica.loc.gov/search/pages/results/?proxtext=${query}`
      },
      {
        title: "Archive.org",
        source: "Internet Archive",
        url: `https://archive.org/search?query=${query}`
      }
    ]
  };
}
__name(buildNewsLinks, "buildNewsLinks");
async function fetchWikimediaContent(name, lat, lon) {
  const result = {
    commons: { photos: [], count: 0 },
    wikipedia: []
  };
  const hasCoords = isValidCoordinates(lat, lon);
  if (hasCoords) {
    try {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        generator: "geosearch",
        ggscoord: `${lat}|${lon}`,
        ggsradius: "1000",
        ggslimit: "6",
        ggsnamespace: "6",
        prop: "imageinfo|coordinates|pageimages|info",
        iiprop: "url|extmetadata",
        iiurlwidth: "640",
        piprop: "thumbnail",
        pithumbsize: "320",
        inprop: "url"
      });
      const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const pages = Object.values(json?.query?.pages || {});
        pages.forEach((page) => {
          const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
          const strip = /* @__PURE__ */ __name((val) => {
            if (!val)
              return null;
            let sanitized = String(val);
            sanitized = sanitized.replace(/<[^>]*>/g, " ");
            sanitized = sanitized.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, num) => {
              const code = Number(num);
              return Number.isFinite(code) ? String.fromCharCode(code) : _;
            }).replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
              const code = parseInt(hex, 16);
              return Number.isFinite(code) ? String.fromCharCode(code) : _;
            });
            return sanitized.replace(/\s+/g, " ").trim();
          }, "strip");
          if (info?.url || page.thumbnail?.source) {
            result.commons.photos.push({
              url: info?.descriptionurl || info?.url || page.fullurl || page.canonicalurl || page.thumbnail?.source,
              thumbnail: info?.thumburl || page.thumbnail?.source || info?.url,
              title: page.title,
              author: strip(info?.extmetadata?.Artist?.value),
              license: strip(info?.extmetadata?.LicenseShortName?.value),
              date: strip(info?.extmetadata?.DateTimeOriginal?.value || info?.extmetadata?.DateTime?.value)
            });
          }
        });
        result.commons.count = result.commons.photos.length;
      }
    } catch (err) {
      console.error("\u274C [Analyze API] Wikimedia Commons fetch failed", err);
    }
  }
  if (hasCoords) {
    try {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        list: "geosearch",
        gscoord: `${lat}|${lon}`,
        gsradius: "5000",
        gslimit: "5"
      });
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const items = json?.query?.geosearch || [];
        result.wikipedia.push(...items.map((item) => ({
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s/g, "_"))}`,
          distance: item.dist
        })));
      }
    } catch (err) {
      console.error("\u274C [Analyze API] Wikipedia geosearch failed", err);
    }
  }
  if (result.wikipedia.length === 0 && name) {
    try {
      const params = new URLSearchParams({
        action: "opensearch",
        format: "json",
        origin: "*",
        limit: "3",
        search: name
      });
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const titles = data?.[1] || [];
        const urls2 = data?.[3] || [];
        titles.forEach((title, idx) => {
          result.wikipedia.push({
            title,
            url: urls2[idx] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s/g, "_"))}`,
            distance: null
          });
        });
      }
    } catch (err) {
      console.error("\u274C [Analyze API] Wikipedia fallback search failed", err);
    }
  }
  return result;
}
__name(fetchWikimediaContent, "fetchWikimediaContent");
function buildHistoryChanges(entries) {
  const changes = [];
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1].tags || {};
    const current = entries[i].tags || {};
    const added = [];
    const removed = [];
    const changed = [];
    Object.keys(current).forEach((key) => {
      if (!(key in prev)) {
        added.push({ key, value: current[key] });
      } else if (prev[key] !== current[key]) {
        changed.push({ key, from: prev[key], to: current[key] });
      }
    });
    Object.keys(prev).forEach((key) => {
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
__name(buildHistoryChanges, "buildHistoryChanges");
async function fetchWaybackReleases() {
  try {
    const res = await fetch("https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json", {
      headers: { "Accept": "application/json" }
    });
    if (!res.ok)
      throw new Error("Wayback release fetch failed");
    const json = await res.json();
    const releaseEntries = Object.entries(json).map(([releaseId, data]) => {
      const dateMatch = data.itemTitle?.match(/Wayback (\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : data.itemTitle || releaseId;
      return {
        id: releaseId,
        date,
        itemTitle: data.itemTitle,
        // The tile URL uses {level}/{row}/{col} format
        tileUrl: data.itemURL?.replace("{level}", "{z}").replace("{row}", "{y}").replace("{col}", "{x}") || `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${releaseId}/{z}/{y}/{x}`
      };
    }).filter((r) => r.tileUrl && r.id).sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateB.localeCompare(dateA);
    });
    const releases = releaseEntries.slice(0, 20);
    releases.unshift({
      id: "latest",
      date: "Latest",
      itemTitle: "Current World Imagery",
      tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    });
    console.log(`\u{1F4C5} [Analyze API] Fetched ${releases.length} Wayback releases`);
    return releases;
  } catch (err) {
    console.error("\u274C [Analyze API] Failed to fetch Wayback releases", err);
    return [
      { id: "latest", date: "Latest", tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" },
      { id: "1034", date: "2023-10-11", tileUrl: "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/1034/{z}/{y}/{x}" },
      { id: "64776", date: "2023-08-31", tileUrl: "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/64776/{z}/{y}/{x}" },
      { id: "45134", date: "2022-12-14", tileUrl: "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/45134/{z}/{y}/{x}" },
      { id: "7110", date: "2022-11-02", tileUrl: "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/7110/{z}/{y}/{x}" }
    ];
  }
}
__name(fetchWaybackReleases, "fetchWaybackReleases");
function buildSatelliteComparison(imagery) {
  if (!imagery)
    return null;
  const historical = (imagery.waybackReleases || []).map((release) => ({
    provider: "Esri Wayback",
    id: release.id,
    date: release.date,
    tileUrl: release.tileUrl
  }));
  return {
    current: imagery.current || null,
    historical,
    availableDates: historical.map((h) => h.date || h.id).filter(Boolean)
  };
}
__name(buildSatelliteComparison, "buildSatelliteComparison");
async function fetchNewsArticles(query) {
  const results = {
    current: [],
    historical: []
  };
  if (!query) {
    return results;
  }
  const tasks = [];
  const parseRssItems = /* @__PURE__ */ __name((xmlText) => {
    try {
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "text/xml");
        const items2 = Array.from(doc.querySelectorAll("item")).slice(0, 3);
        return items2.map((item) => ({
          title: item.querySelector("title")?.textContent || "Untitled",
          url: item.querySelector("link")?.textContent || "#",
          date: item.querySelector("pubDate")?.textContent || null,
          source: "Google News"
        }));
      }
    } catch (e) {
    }
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match2;
    while ((match2 = itemRegex.exec(xmlText)) !== null && items.length < 3) {
      const block = match2[1];
      const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = block.match(/<link>(.*?)<\/link>/);
      const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
      const title = titleMatch ? titleMatch[1] || titleMatch[2] : "Untitled";
      const link = linkMatch ? linkMatch[1] : "#";
      items.push({
        title,
        url: link,
        date: dateMatch ? dateMatch[1] : null,
        source: "Google News"
      });
    }
    return items;
  }, "parseRssItems");
  tasks.push((async () => {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(rssUrl);
      if (res.ok) {
        const text = await res.text();
        results.current = parseRssItems(text);
      }
    } catch (err) {
      console.error("\u274C [Analyze API] Google News RSS failed", err?.message || err);
    }
  })());
  tasks.push((async () => {
    try {
      const chroniclingUrl = `https://chroniclingamerica.loc.gov/search/pages/results/?format=json&proxtext=${encodeURIComponent(query)}&rows=3`;
      const res = await fetch(chroniclingUrl, { headers: { "Accept": "application/json" } });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json?.items) ? json.items.slice(0, 3) : [];
        const mapped = items.map((item) => ({
          title: item.headline || item.title || item.label || "Article",
          url: item.id || item.url || item["@id"],
          date: item.date || item.created || item.pub_date,
          source: item.publisher || "Chronicling America",
          snippet: item.snippet || item.text || null
        }));
        results.historical.push(...mapped);
      }
    } catch (err) {
      console.error("\u274C [Analyze API] Chronicling America fetch failed", err?.message || err);
    }
  })());
  tasks.push((async () => {
    try {
      const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&output=json&rows=3`;
      const res = await fetch(archiveUrl, { headers: { "Accept": "application/json" } });
      if (res.ok) {
        const json = await res.json();
        const docs = json?.response?.docs || [];
        const mapped = docs.slice(0, 3).map((doc) => ({
          title: doc.title || "Archive Item",
          url: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
          date: doc.date || doc.year,
          source: doc.creator || "Archive.org",
          snippet: doc.description ? Array.isArray(doc.description) ? doc.description[0] : doc.description : null
        }));
        results.historical.push(...mapped);
      }
    } catch (err) {
      console.error("\u274C [Analyze API] Archive.org fetch failed", err?.message || err);
    }
  })());
  await Promise.allSettled(tasks);
  return results;
}
__name(fetchNewsArticles, "fetchNewsArticles");
function buildAccessLines(origin, accessPoints = []) {
  if (!isValidCoordinates(origin.lat, origin.lon))
    return [];
  return accessPoints.filter((p) => isValidCoordinates(p.lat, p.lon)).map((p) => ({
    from: { lat: origin.lat, lon: origin.lon },
    to: { lat: p.lat, lon: p.lon },
    distance: p.distance || calculateDistanceMeters(origin.lat, origin.lon, p.lat, p.lon),
    label: p.name || p.tags?.highway || "Access"
  }));
}
__name(buildAccessLines, "buildAccessLines");
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
    summary: "Direct line (routing unavailable)",
    isFallback: true
  };
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("\u274C [Analyze API] Routing request failed", res.status, res.statusText);
      return fallback;
    }
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route)
      return fallback;
    const leg = route.legs && route.legs[0];
    const steps = (leg?.steps || []).map((step) => ({
      distance: step.distance,
      duration: step.duration,
      instruction: step.maneuver?.instruction || step.name || "Continue",
      name: step.name || ""
    }));
    return {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      summary: leg?.summary || "Route",
      steps
    };
  } catch (err) {
    console.error("\u274C [Analyze API] Routing error", err);
    return fallback;
  }
}
__name(fetchRoute, "fetchRoute");
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
    const overpassData = await fetchOverpass(query);
    const overpassDuration = Date.now() - requestStartTime;
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
    let distanceAccess = null;
    if (isValidCoordinates(processedElement.lat, processedElement.lon)) {
      try {
        distanceAccess = await findAccessAndDistances(processedElement.lat, processedElement.lon);
      } catch (error) {
        console.error("\u274C [Analyze API] Distance analysis failed", error);
      }
    }
    let history = null;
    try {
      history = await fetchHistoryData(type, id);
      if (history?.history) {
        history.changes = buildHistoryChanges(history.history);
      }
    } catch (error) {
      console.error("\u274C [Analyze API] History retrieval failed", error);
    }
    const imageryLinks = buildImageryLinks(processedElement.lat, processedElement.lon);
    const streetViewLinks = buildStreetViewLinks(processedElement.lat, processedElement.lon);
    let imagery = imageryLinks;
    try {
      const releases = await fetchWaybackReleases();
      imagery = {
        ...imageryLinks,
        waybackReleases: releases
      };
    } catch (err) {
      console.error("\u274C [Analyze API] Imagery release fetch failed", err);
    }
    const newsLinks = buildNewsLinks(processedElement.name, processedElement.address, processedElement.lat, processedElement.lon);
    const newsQueryParts = [];
    if (processedElement.name) {
      newsQueryParts.push(`"${processedElement.name}"`);
    }
    if (processedElement.address) {
      if (processedElement.address["addr:city"])
        newsQueryParts.push(processedElement.address["addr:city"]);
      if (processedElement.address["addr:state"])
        newsQueryParts.push(processedElement.address["addr:state"]);
    }
    const nativeNews = await fetchNewsArticles(newsQueryParts.join(" ").trim() || null);
    const news = { ...newsLinks, articles: nativeNews };
    let wikimedia = { commons: { photos: [], count: 0 }, wikipedia: [] };
    try {
      wikimedia = await fetchWikimediaContent(processedElement.name, processedElement.lat, processedElement.lon);
    } catch (err) {
      console.error("\u274C [Analyze API] Wikimedia enrichment failed", err);
    }
    const satelliteComparison = buildSatelliteComparison(imagery);
    let routing = null;
    if (distanceAccess) {
      const origin = { lat: processedElement.lat, lon: processedElement.lon };
      routing = {};
      if (distanceAccess.nearestParking && distanceAccess.nearestRoad) {
        const [parkingRoute, roadRoute] = await Promise.all([
          fetchRoute(origin, distanceAccess.nearestParking),
          fetchRoute(origin, distanceAccess.nearestRoad)
        ]);
        routing.parkingRoute = parkingRoute;
        routing.roadRoute = roadRoute;
      } else if (distanceAccess.nearestParking) {
        routing.parkingRoute = await fetchRoute(origin, distanceAccess.nearestParking);
      } else if (distanceAccess.nearestRoad) {
        routing.roadRoute = await fetchRoute(origin, distanceAccess.nearestRoad);
      }
      routing.accessLines = buildAccessLines(origin, distanceAccess.accessPoints || []);
    }
    const totalDuration = Date.now() - requestStartTime;
    console.log(`\u23F1\uFE0F  [Analyze API] Response received in ${overpassDuration}ms`);
    console.log(`\u2728 [Analyze API] Analysis complete (total time: ${totalDuration}ms)`);
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    return new Response(JSON.stringify({
      element: processedElement,
      distanceAccess,
      history,
      imagery,
      streetView: streetViewLinks,
      news,
      commons: wikimedia.commons,
      wikipedia: wikimedia.wikipedia,
      satelliteComparison,
      routing,
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

// api/search.js
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
    const addBboxQueries = /* @__PURE__ */ __name((tags, south, west, north, east) => {
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
    const addPolygonQueries = /* @__PURE__ */ __name((tags, polygonStr) => {
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
__name(onRequestGet2, "onRequestGet");

// ../.wrangler/tmp/pages-laphDd/functionsRoutes-0.6745843278521406.mjs
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

// ../node_modules/path-to-regexp/dist.es2015/index.js
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
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
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
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
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
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
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
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
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
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
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
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
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
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
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
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
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

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
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

// ../.wrangler/tmp/bundle-UnyLKd/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
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
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-UnyLKd/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
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
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
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
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.6562763724961109.mjs.map
