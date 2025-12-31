/**
 * Tests for the search API function
 * Note: These tests assume the API is already started (per user preference)
 * Integration tests are skipped in CI environments where the server is not available
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Skip integration tests in CI where the server is not available
const isCI = process.env.CI === 'true';

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
        it.skipIf(isCI)('should reject requests without type parameter', async () => {
            const response = await fetch(`${API_BASE_URL}`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Invalid search type');
        });

        it.skipIf(isCI)('should reject invalid search type', async () => {
            const response = await fetch(`${API_BASE_URL}?type=invalid`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Invalid search type');
        });

        it.skipIf(isCI)('should require area parameter for city search', async () => {
            const response = await fetch(`${API_BASE_URL}?type=city`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Area parameter is required');
        });

        it.skipIf(isCI)('should require coordinates and radius for radius search', async () => {
            const response = await fetch(`${API_BASE_URL}?type=radius`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Invalid coordinates or radius');
        });

        it.skipIf(isCI)('should require polygon parameter for polygon search', async () => {
            const response = await fetch(`${API_BASE_URL}?type=polygon`);
            const data = await response.json();
            
            expect(response.status).toBe(400);
            expect(data.error).toContain('Polygon parameter is required');
        });
    });

    describe('City Search', () => {
        it.skipIf(isCI)('should handle valid city search', { timeout: 60000 }, async () => {
            // Using a smaller city for faster test execution
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=Hoboken NJ&abandoned=true&disused=true`
            );
            
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('places');
            expect(data).toHaveProperty('count');
            expect(data).toHaveProperty('searchArea');
            expect(Array.isArray(data.places)).toBe(true);
        });

        it.skipIf(isCI)('should handle city not found', async () => {
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
        it.skipIf(isCI)('should handle valid radius search', async () => {
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

        it.skipIf(isCI)('should reject invalid coordinates', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=radius&lat=100&lon=-74.0060&radius=1&abandoned=true`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('Coordinates out of valid range');
        });

        it.skipIf(isCI)('should reject invalid radius', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=radius&lat=40.7128&lon=-74.0060&radius=-1&abandoned=true`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('Radius must be greater than 0');
        });
    });

    describe('Polygon Search', () => {
        it.skipIf(isCI)('should handle valid polygon search', { timeout: 30000 }, async () => {
            const polygon = '40.7128,-74.0060,40.7228,-74.0060,40.7228,-74.0160,40.7128,-74.0160';
            const response = await fetch(
                `${API_BASE_URL}?type=polygon&polygon=${polygon}&abandoned=true`
            );
            
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('places');
            expect(data).toHaveProperty('searchArea');
            expect(data.searchArea).toHaveProperty('coordinates');
        });

        it.skipIf(isCI)('should reject polygon with less than 3 points', async () => {
            const polygon = '40.7128,-74.0060,40.7228,-74.0060';
            const response = await fetch(
                `${API_BASE_URL}?type=polygon&polygon=${polygon}&abandoned=true`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            // The API validates format first, then checks point count
            expect(data.error).toBeDefined();
        });

        it.skipIf(isCI)('should reject invalid polygon format', async () => {
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
        it.skipIf(isCI)('should require at least one filter', async () => {
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=New York&abandoned=false&disused=false&ruinsYes=false&historicRuins=false&railwayAbandoned=false&railwayDisused=false&disusedRailwayStation=false&abandonedRailwayStation=false&buildingConditionRuinous=false&buildingRuins=false&disusedAmenity=false&abandonedAmenity=false&disusedShop=false&abandonedShop=false&shopVacant=false&landuseBrownfield=false&disusedAeroway=false&abandonedAeroway=false`
            );
            
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('No filters selected');
        });

        it.skipIf(isCI)('should accept filter parameters', { timeout: 60000 }, async () => {
            // Using a smaller city for faster test execution
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=Hoboken NJ&abandoned=true&disused=false`
            );
            
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('places');
        });
    });

    describe('Response Format', () => {
        it.skipIf(isCI)('should return CORS headers', { timeout: 60000 }, async () => {
            // Using a smaller city for faster test execution
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=Hoboken NJ&abandoned=true`
            );
            
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(response.headers.get('Content-Type')).toBe('application/json');
        });

        it.skipIf(isCI)('should return valid JSON structure', { timeout: 60000 }, async () => {
            // Using a smaller city for faster test execution
            const response = await fetch(
                `${API_BASE_URL}?type=city&area=Hoboken NJ&abandoned=true`
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
        });
    });
});

