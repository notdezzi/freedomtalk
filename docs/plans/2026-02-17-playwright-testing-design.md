# Playwright Testing Infrastructure Design

**Date:** 2026-02-17
**Status:** Approved
**Goals:** Shipping confidence, API performance audit, comprehensive coverage

## Overview

Set up Playwright for end-to-end testing with built-in API call tracking to detect duplicate and unnecessary API calls. Tests will run both locally and in CI (GitHub Actions) from day one.

## Architecture

```
freedomtalk/
├── tests/                          # Playwright test suite
│   ├── e2e/                        # End-to-end browser tests
│   │   ├── auth.spec.ts            # Registration, login, logout
│   │   ├── messaging.spec.ts       # Server channel messaging
│   │   ├── dm.spec.ts              # Direct messages
│   │   ├── friends.spec.ts         # Friend requests/accept/reject
│   │   └── servers.spec.ts         # Server CRUD, channels
│   ├── api/                        # API integration tests
│   │   ├── auth.spec.ts
│   │   ├── messages.spec.ts
│   │   └── users.spec.ts
│   ├── fixtures/                   # Shared test fixtures
│   │   ├── auth.fixture.ts         # Authenticated page state
│   │   ├── api-tracker.fixture.ts  # API call tracking
│   │   └── test-data.ts            # Test data generators
│   ├── utils/                      # Test utilities
│   │   ├── api-monitor.ts          # Detect duplicate/unnecessary calls
│   │   ├── db-helpers.ts           # Database cleanup/seed
│   │   └── wait-for.ts             # Custom wait helpers
│   └── setup/                      # Test environment setup
│       ├── global-setup.ts         # Start Docker, wait for services
│       └── global-teardown.ts      # Cleanup
├── playwright.config.ts            # Playwright configuration
├── docker-compose.test.yml         # Test environment containers
└── .github/workflows/e2e.yml       # CI workflow
```

## Test Environment

### Docker Compose (Local)

```yaml
services:
  test-db:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: freedomtalk_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data

  test-redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"

  test-api:
    build:
      context: ./packages/api
      dockerfile: Dockerfile.test
    ports:
      - "3002:3001"
    depends_on:
      - test-db
      - test-redis

  test-web:
    build:
      context: ./packages/web
      dockerfile: Dockerfile.test
    ports:
      - "3001:3000"
    depends_on:
      - test-api
```

**Key points:**
- Separate ports (5433, 6380, 3002, 3001) to avoid conflicts with dev services
- `tmpfs` for PostgreSQL = in-memory database = faster tests
- Dedicated test database (`freedomtalk_test`)

## API Call Tracking

### Monitor Implementation

```typescript
interface APICall {
  url: string;
  method: string;
  timestamp: number;
  testId: string;
}

class APIMonitor {
  track(request: Request): void;
  analyze(): { duplicates: DuplicateCall[]; unnecessary: UnnecessaryCall[] };
  getCallCount(url: string): number;
}
```

### Detection Rules

**Duplicates:**
- Same URL + method called multiple times within 100ms window

**Unnecessary:**
- Fetching same data that was just fetched
- Calls returning 304 (cached but still made)
- Polling intervals too aggressive (< 1s)

### Test Assertions

```typescript
// Assert no duplicates
expectNoDuplicateCalls(monitor);

// Assert specific call count
expect(monitor.getCallCount('/api/v1/users/@me')).toBe(1);
```

## Test Structure

### Fixtures

- `authenticatedPage`: Pre-authenticated page with valid session
- `user`: Test user data for current test
- `monitor`: API call tracker for assertions

### Test Categories

1. **E2E Tests** (`tests/e2e/`):
   - Full browser automation
   - WebSocket real-time features
   - Multi-user scenarios (multiple browser contexts)

2. **API Tests** (`tests/api/`):
   - Direct HTTP requests
   - Authentication/authorization
   - Validation edge cases

### Test Data Helpers

```typescript
createTestUser(overrides?)
createTestServer(ownerId)
createTestChannel(serverId)
createFriendRelationship(user1, user2)
```

## CI/CD (GitHub Actions)

### Matrix Strategy

| Project | When |
|---------|------|
| api | Always |
| e2e-chromium | Always |
| e2e-firefox | Main branch only |

### Workflow Steps

1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run migrations on test DB
5. Build packages
6. Install Playwright browsers
7. Run tests
8. Upload artifacts (reports, traces)
9. Analyze API calls
10. Comment PR with analysis
11. Fail if critical duplicates found

### API Analysis Report

Posted as PR comment with:
- Total API calls
- Unique endpoints
- Duplicate calls detected
- Recommendations for fixes

## Success Criteria

1. **Shipping Confidence**: All critical user flows have passing tests
   - Auth (register, login, logout, OAuth)
   - Messaging (send, receive, edit, delete)
   - DMs (create, send, receive)
   - Friends (request, accept, reject)
   - Servers (create, join, manage)

2. **API Performance**: No duplicate API calls in any test
   - Same endpoint not called >1 time per page load
   - No calls within 100ms to same endpoint

3. **Comprehensive Coverage**: All major features tested
   - E2E tests for all user-facing features
   - API tests for all endpoints
   - Edge cases and error handling

## Dependencies to Add

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "playwright": "^1.40.0"
  }
}
```
