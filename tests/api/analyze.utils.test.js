import { describe, it, expect, afterEach } from 'vitest';
import { calculateDistanceMeters, parseOSMHistoryXml, summarizeHistory, buildImageryLinks, buildNewsLinks, buildStreetViewLinks, buildHistoryChanges, buildAccessLines, fetchRoute, fetchNewsArticles, fetchWaybackReleases, isValidCoordinates, buildRelatedMediaLinks, estimateVegetationOvergrowth, buildSatelliteComparison } from '../../functions/api/analyze.js';
import { vi } from 'vitest';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Analyze helpers', () => {
    describe('calculateDistanceMeters', () => {
        it('returns zero for identical coordinates', () => {
            expect(calculateDistanceMeters(10, 10, 10, 10)).toBe(0);
        });

        it('calculates realistic distance', () => {
            const distance = calculateDistanceMeters(40.7128, -74.0060, 39.9526, -75.1652);
            expect(distance).toBeGreaterThan(120000);
            expect(distance).toBeLessThan(140000);
        });
    });

    describe('parseOSMHistoryXml and summarizeHistory', () => {
        const sampleHistory = `
            <osm version="0.6">
                <node id="1" version="2" timestamp="2021-01-01T00:00:00Z" user="mapper2">
                    <tag k="abandoned" v="yes"/>
                </node>
                <node id="1" version="1" timestamp="2020-01-01T00:00:00Z" user="mapper1">
                    <tag k="name" v="Test Location"/>
                </node>
            </osm>
        `;

        it('parses XML history entries and sorts by version', () => {
            const entries = parseOSMHistoryXml(sampleHistory, 'node');
            expect(entries).toHaveLength(2);
            expect(entries[0].version).toBe(1);
            expect(entries[1].version).toBe(2);
            expect(entries[0].tags.name).toBe('Test Location');
        });

        it('summarizes history metadata', () => {
            const entries = parseOSMHistoryXml(sampleHistory, 'node');
            const summary = summarizeHistory(entries);

            expect(summary.firstMapped).toBe('2020-01-01T00:00:00Z');
            expect(summary.lastEdited).toBe('2021-01-01T00:00:00Z');
            expect(summary.abandonedTagAdded).toBe('2021-01-01T00:00:00Z');
            expect(summary.contributors).toEqual(['mapper1', 'mapper2']);
        });
    });

    describe('coordinate validation', () => {
        it('accepts valid ranges', () => {
            expect(isValidCoordinates(0, 0)).toBe(true);
            expect(isValidCoordinates(45, 179.9)).toBe(true);
        });

        it('rejects invalid ranges', () => {
            expect(isValidCoordinates(91, 0)).toBe(false);
            expect(isValidCoordinates(0, -181)).toBe(false);
            expect(isValidCoordinates('a', 'b')).toBe(false);
        });
    });

    describe('link builders', () => {
        it('returns null for invalid coordinates', () => {
            expect(buildImageryLinks(null, null)).toBeNull();
            expect(buildStreetViewLinks(200, 10)).toBeNull();
        });

        it('builds imagery links for valid coordinates', () => {
            const imagery = buildImageryLinks(10, 20);
            expect(imagery.current.url).toContain('10');
            expect(imagery.historical.length).toBeGreaterThan(0);
        });

        it('builds news links with fallback when missing coords', () => {
            const news = buildNewsLinks('Place', {}, null, null);
            expect(news.current[0].url).toContain('Place');
        });

        it('builds street view links for valid coords', () => {
            const links = buildStreetViewLinks(10, 20);
            expect(links.google.url).toContain('10');
        });
    });

    describe('history changes', () => {
        it('computes added/changed/removed tags', () => {
            const entries = [
                { version: 1, timestamp: 't1', user: 'a', tags: { name: 'Old', foo: 'bar' } },
                { version: 2, timestamp: 't2', user: 'b', tags: { name: 'New', baz: 'qux' } }
            ];
            const changes = buildHistoryChanges(entries);
            expect(changes).toHaveLength(1);
            expect(changes[0].removed[0]).toEqual({ key: 'foo', value: 'bar' });
            expect(changes[0].added[0]).toEqual({ key: 'baz', value: 'qux' });
            expect(changes[0].changed[0]).toEqual({ key: 'name', from: 'Old', to: 'New' });
        });
    });

    describe('access lines', () => {
        it('skips invalid coords', () => {
            const lines = buildAccessLines({ lat: 0, lon: 0 }, [{ lat: 999, lon: 0 }]);
            expect(lines).toHaveLength(0);
        });
        it('builds lines with distances', () => {
            const lines = buildAccessLines({ lat: 0, lon: 0 }, [{ lat: 0, lon: 1 }]);
            expect(lines[0].distance).toBeGreaterThan(0);
        });
    });

    describe('fetchRoute', () => {
        it('returns fallback with flag when routing fails', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('fail'));
            const route = await fetchRoute({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
            expect(route.isFallback).toBe(true);
            expect(route.geometry.coordinates).toHaveLength(2);
        });
    });

    describe('fetchWaybackReleases', () => {
        it('sanitizes release id', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ releases: [{ release: 'bad/../id', releaseDate: '2020' }] })
            });
            const releases = await fetchWaybackReleases();
            expect(releases[0].tileUrl).not.toContain('..');
        });
    });

    describe('fetchNewsArticles', () => {
        it('fetches in parallel and maps items', async () => {
            const rssBody = `
                <rss><channel>
                    <item><title>Test</title><link>https://example.com/a</link><pubDate>Today</pubDate></item>
                </channel></rss>`;
            const chroniclingBody = { items: [{ title: 'Paper', id: 'https://paper' }] };
            const archiveBody = { response: { docs: [{ title: 'Archive', identifier: 'arc id' }] } };
            const fetchMock = vi.fn()
                .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(rssBody) })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chroniclingBody) })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(archiveBody) });
            global.fetch = fetchMock;
            const news = await fetchNewsArticles('query');
            expect(news.current[0].title).toBe('Test');
            expect(news.historical.length).toBeGreaterThan(0);
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });
    });

    describe('buildRelatedMediaLinks', () => {
        it('returns link collections for multiple providers', () => {
            const media = buildRelatedMediaLinks('Test Place', 10, 20, { 'addr:city': 'Test', 'addr:state': 'TS' });
            expect(media.flickr[0].url).toContain('flickr.com');
            expect(media.youtube[0].url).toContain('youtube.com');
            expect(media.reddit.length).toBeGreaterThan(0);
        });
    });

    describe('buildSatelliteComparison', () => {
        it('maps available releases into comparison object', () => {
            const comparison = buildSatelliteComparison({
                current: { provider: 'Now', url: 'https://example.com/current' },
                waybackReleases: [
                    { id: '2020', date: '2020', tileUrl: 'https://tiles/2020/{z}/{x}/{y}' }
                ]
            });
            expect(comparison.historical[0].provider).toBe('Esri Wayback');
            expect(comparison.availableDates).toContain('2020');
        });
    });

    describe('estimateVegetationOvergrowth', () => {
        it('returns bounded coverage estimates', () => {
            const veg = estimateVegetationOvergrowth(10, 20);
            expect(veg.current.coverage).toBeGreaterThan(0);
            expect(veg.current.coverage).toBeLessThanOrEqual(1);
            expect(veg.historical.length).toBeGreaterThan(0);
        });
    });
});
