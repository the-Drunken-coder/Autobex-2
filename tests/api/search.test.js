/**
 * Tests for the search API function
 * Note: These tests assume the API is already started (per user preference)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Cloudflare Pages Function environment
const createMockContext = (url, method = 'GET') => {
    const urlObj = new URL(url);
    return {
        request: new Request(url, { method }),
        env: {},
        waitUntil: vi.fn(),
        passThroughOnException: vi.fn(),
    };
};

// Since we can't directly import the function (it's a Cloudflare Pages Function),
// we'll test the logic by making HTTP requests to the running server
// or by extracting testable logic

describe('Search API', () => {
    const API_BASE_URL = 'http://localhost:8788/api/search';

    describe('Input Validation', () => {
        it('should reject requests without type parameter', async () => {
            const response = await fetch(`${API_BASE_URL}`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Invalid search type');
        });

        it('should reject invalid search type', async () => {
            const response = await fetch(`${API_BASE_URL}?type=invalid`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Invalid search type');
        });

        it('should require area parameter for city search', async () => {
            const response = await fetch(`${API_BASE_URL}?type=city`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Area parameter is required');
        });

        it('should require coordinates and radius for radius search', async () => {
            const response = await fetch(`${API_BASE_URL}?type=radius`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Invalid coordinates or radius');
        });

        it('should require polygon parameter for polygon search', async () => {
            const response = await fetch(`${API_BASE_URL}?type=polygon`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Polygon parameter is required');
        });
    });

    describe('City Search', () => {
        it('should handle valid city search', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=New York&abandoned=true&disused=true`
            );
            
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('places');
            expect(data).toHaveProperty('count');
            expect(data).toHaveProperty('searchArea');
            expect(Array.isArray(data.places)).toBe(true);
        }, { timeout: 30000 });

        it('should handle city not found', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=NonexistentCity12345&abandoned=true`
            );
            
            // Should return 200 with empty places array
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.places).toEqual([]);
        });
    });

    describe('Radius Search', () => {
        it('should handle valid radius search', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=radius&lat=40.7128&lon=-74.0060&radius=1&abandoned=true`
            );
            
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('places');
            expect(data).toHaveProperty('searchArea');
            expect(data.searchArea).toHaveProperty('lat', 40.7128);
            expect(data.searchArea).toHaveProperty('lon', -74.0060);
            expect(data.searchArea).toHaveProperty('radius', 1);
        });

        it('should reject invalid coordinates', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=radius&lat=100&lon=-74.0060&radius=1&abandoned=true`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('Coordinates out of valid range');
        });

        it('should reject invalid radius', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=radius&lat=40.7128&lon=-74.0060&radius=-1&abandoned=true`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('Radius must be greater than 0');
        });
    });

    describe('Polygon Search', () => {
        it('should handle valid polygon search', async () => {
            const polygon = '40.7128,-74.0060,40.7228,-74.0060,40.7228,-74.0160,40.7128,-74.0160';
            const response = await fetch(
                `${API_BASE_URL}?type=polygon&polygon=${polygon}&abandoned=true`
            );
            
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('places');
            expect(data).toHaveProperty('searchArea');
            expect(data.searchArea).toHaveProperty('coordinates');
        }, { timeout: 30000 });

        it('should reject polygon with less than 3 points', async () => {
            const polygon = '40.7128,-74.0060,40.7228,-74.0060';
            const response = await fetch(
                `${API_BASE_URL}?type=polygon&polygon=${polygon}&abandoned=true`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            // The API validates format first, then checks point count
            expect(data.error).toBeDefined();
        });

        it('should reject invalid polygon format', async () => {
            const polygon = 'invalid';
            const response = await fetch(
                `${API_BASE_URL}?type=polygon&polygon=${polygon}&abandoned=true`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('Invalid polygon format');
        });
    });

    describe('Filter Parameters', () => {
        it('should require at least one filter', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=New York&abandoned=false&disused=false&ruinsYes=false&historicRuins=false&railwayAbandoned=false&railwayDisused=false&disusedRailwayStation=false&abandonedRailwayStation=false&buildingConditionRuinous=false&buildingRuins=false&disusedAmenity=false&abandonedAmenity=false&disusedShop=false&abandonedShop=false&shopVacant=false&landuseBrownfield=false&disusedAeroway=false&abandonedAeroway=false`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('No filters selected');
        });

        it('should accept filter parameters', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=New York&abandoned=true&disused=false`
            );
            
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('places');
        }, { timeout: 30000 });
    });

    describe('Response Format', () => {
        it('should return CORS headers', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=New York&abandoned=true`
            );
            
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(response.headers.get('Content-Type')).toBe('application/json');
        }, { timeout: 30000 });

        it('should return valid JSON structure', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=New York&abandoned=true`
            );
            
            const data = await response.json();
            expect(data).toHaveProperty('places');
            // count might not be present in error responses
            if (response.status === 200) {
                expect(data).toHaveProperty('count');
                expect(data).toHaveProperty('searchArea');
                expect(typeof data.count).toBe('number');
            }
            expect(Array.isArray(data.places)).toBe(true);
        }, { timeout: 30000 });
    });
});

