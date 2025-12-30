import { describe, it, expect } from 'vitest';
import { calculateDistanceMeters, parseOSMHistoryXml, summarizeHistory, buildImageryLinks, buildNewsLinks, buildStreetViewLinks, isValidCoordinates } from '../../functions/api/analyze.js';

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
});
