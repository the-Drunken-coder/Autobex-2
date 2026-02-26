/**
 * Tests for frontend utility functions
 * These test pure functions that can be extracted and tested independently
 */

import { describe, it, expect } from 'vitest';

// Test coordinate validation logic
function validateCoordinate(lat, lon) {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// Test distance calculation (Haversine formula)
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

// Test polygon coordinate parsing
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

describe('Frontend Utilities', () => {
    describe('validateCoordinate', () => {
        it('should accept valid coordinates', () => {
            expect(validateCoordinate(40.7128, -74.0060)).toBe(true);
            expect(validateCoordinate(0, 0)).toBe(true);
            expect(validateCoordinate(90, 180)).toBe(true);
            expect(validateCoordinate(-90, -180)).toBe(true);
        });

        it('should reject invalid latitude', () => {
            expect(validateCoordinate(91, -74.0060)).toBe(false);
            expect(validateCoordinate(-91, -74.0060)).toBe(false);
        });

        it('should reject invalid longitude', () => {
            expect(validateCoordinate(40.7128, 181)).toBe(false);
            expect(validateCoordinate(40.7128, -181)).toBe(false);
        });
    });

    describe('calculateDistance', () => {
        it('should calculate distance between two points', () => {
            // Distance between New York and Philadelphia (approximately 130 km)
            const distance = calculateDistance(40.7128, -74.0060, 39.9526, -75.1652);
            expect(distance).toBeGreaterThan(120000); // ~130km in meters
            expect(distance).toBeLessThan(140000);
        });

        it('should return 0 for same coordinates', () => {
            const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
            expect(distance).toBe(0);
        });

        it('should handle negative coordinates', () => {
            const distance = calculateDistance(-40.7128, -74.0060, -40.7228, -74.0160);
            expect(distance).toBeGreaterThan(0);
        });
    });

    describe('parsePolygonCoordinates', () => {
        it('should parse valid polygon coordinates', () => {
            const text = '40.7128,-74.0060\n40.7228,-74.0060\n40.7228,-74.0160\n40.7128,-74.0160';
            const coords = parsePolygonCoordinates(text);
            
            expect(coords).toHaveLength(4);
            expect(coords[0]).toEqual({ lat: 40.7128, lon: -74.0060 });
            expect(coords[1]).toEqual({ lat: 40.7228, lon: -74.0060 });
        });

        it('should handle comma-separated format', () => {
            const text = '40.7128,-74.0060,40.7228,-74.0060,40.7228,-74.0160';
            // This function expects newline-separated, so this should fail
            expect(() => parsePolygonCoordinates(text)).toThrow();
        });

        it('should reject polygon with less than 3 points', () => {
            const text = '40.7128,-74.0060\n40.7228,-74.0060';
            expect(() => parsePolygonCoordinates(text)).toThrow('at least 3 coordinates');
        });

        it('should reject invalid coordinate format', () => {
            const text = '40.7128\n40.7228,-74.0060\n40.7228,-74.0160';
            expect(() => parsePolygonCoordinates(text)).toThrow('Invalid coordinate format');
        });

        it('should reject invalid coordinate values', () => {
            const text = 'invalid,-74.0060\n40.7228,-74.0060\n40.7228,-74.0160';
            expect(() => parsePolygonCoordinates(text)).toThrow('Invalid coordinate values');
        });

        it('should reject coordinates out of range', () => {
            const text = '100,-74.0060\n40.7228,-74.0060\n40.7228,-74.0160';
            expect(() => parsePolygonCoordinates(text)).toThrow('Coordinate out of range');
        });

        it('should ignore empty lines', () => {
            const text = '40.7128,-74.0060\n\n40.7228,-74.0060\n40.7228,-74.0160';
            const coords = parsePolygonCoordinates(text);
            expect(coords).toHaveLength(3);
        });

        it('should trim whitespace', () => {
            const text = '  40.7128  ,  -74.0060  \n  40.7228  ,  -74.0060  \n  40.7228  ,  -74.0160  ';
            const coords = parsePolygonCoordinates(text);
            expect(coords[0]).toEqual({ lat: 40.7128, lon: -74.0060 });
        });
    });

    describe('Marker color for police stations', () => {
        // Mirrors the logic in app.js addMarker/createMarkerForPlace
        function getMarkerColor(place) {
            const isPoliceStation = place.tags.amenity === 'police';
            return isPoliceStation ? '#3b82f6' : '#f59e0b';
        }

        it('should return blue for police stations', () => {
            const place = { tags: { amenity: 'police' } };
            expect(getMarkerColor(place)).toBe('#3b82f6');
        });

        it('should return amber for non-police places', () => {
            const place = { tags: { abandoned: 'yes' } };
            expect(getMarkerColor(place)).toBe('#f59e0b');
        });

        it('should return amber when amenity is not police', () => {
            const place = { tags: { amenity: 'hospital' } };
            expect(getMarkerColor(place)).toBe('#f59e0b');
        });
    });

    describe('Status tags for police stations', () => {
        function getStatusTags(place) {
            const statusTags = [];
            if (place.tags.abandoned === 'yes') statusTags.push('Abandoned');
            if (place.tags.disused === 'yes') statusTags.push('Disused');
            if (place.tags.ruins === 'yes') statusTags.push('Ruins');
            if (place.tags.historic === 'ruins') statusTags.push('Historic Ruins');
            if (place.tags.amenity === 'police') statusTags.push('Police Station');
            return statusTags;
        }

        it('should include Police Station tag for police amenity', () => {
            const place = { tags: { amenity: 'police' } };
            expect(getStatusTags(place)).toContain('Police Station');
        });

        it('should not include Police Station tag for non-police places', () => {
            const place = { tags: { abandoned: 'yes' } };
            expect(getStatusTags(place)).not.toContain('Police Station');
        });

        it('should include both Abandoned and Police Station tags', () => {
            const place = { tags: { abandoned: 'yes', amenity: 'police' } };
            const tags = getStatusTags(place);
            expect(tags).toContain('Abandoned');
            expect(tags).toContain('Police Station');
        });
    });
});

