# Test Suite

This project includes comprehensive tests for both Python and JavaScript components.

## Test Structure

- **Python Tests**: `tests/test_start.py` - Tests for the development server startup script
- **JavaScript API Tests**: `tests/api/search.test.js` - Integration tests for the search API endpoint
- **JavaScript Frontend Tests**: `tests/frontend/utils.test.js` - Unit tests for frontend utility functions

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Python Tests Only
```bash
npm run test:py
# or
python -m pytest tests/test_start.py -v
```

### Run JavaScript Tests Only
```bash
npm run test:js
# or
npm run test:js:watch  # Watch mode for development
```

## Test Requirements

### Python Tests
- Requires `pytest` and `pytest-watch`
- Install with: `pip install -r requirements.txt`

### JavaScript Tests
- Requires `vitest` (installed via npm)
- API tests assume the development server is running on `http://localhost:8788`
- To run API tests, start the server first:
  ```bash
  npm run dev
  ```
  Then in another terminal:
  ```bash
  npm run test:js
  ```

## Test Coverage

- **Python**: Tests cover all functions in `start.py` including:
  - Node.js/npm detection
  - Dependency checking
  - Server startup error handling

- **JavaScript API**: Tests cover:
  - Input validation
  - Search type handling (city, radius, polygon)
  - Filter parameter validation
  - Response format validation

- **JavaScript Frontend**: Tests cover:
  - Coordinate validation
  - Distance calculations
  - Polygon coordinate parsing

## Notes

- API integration tests require the server to be running (per user preference)
- Some API tests may timeout if the Overpass API is slow - this is expected
- Frontend utility tests are pure unit tests and don't require the server

