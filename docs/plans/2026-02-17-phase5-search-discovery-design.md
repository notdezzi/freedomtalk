# Phase 5: Search & Discovery Design

**Date:** 2026-02-17
**Status:** Approved
**Technology:** Meilisearch (replacing Elasticsearch for lighter footprint)

## Overview

Implement full-text search and server discovery for FreedomTalk using Meilisearch. This phase covers:
- Milestone 5.1: Search Infrastructure
- Milestone 5.2: Server Discovery

## Infrastructure

### Meilisearch Docker Configuration

```yaml
meilisearch:
  image: getmeili/meilisearch:v1.10
  container_name: freedomtalk-meilisearch
  environment:
    MEILI_MASTER_KEY: ${MEILI_MASTER_KEY:-masterKey}
    MEILI_ENV: development
  ports:
    - '7700:7700'
  volumes:
    - meilisearch_data:/data
```

### Index Structure

| Index | Primary Key | Searchable Fields | Filterable Fields |
|-------|-------------|-------------------|-------------------|
| `messages` | id | content | channel_id, server_id, author_id, created_at |
| `users` | id | username, display_name | status, created_at |
| `servers` | id | name, description | member_count, nsfw, verified, category |

## Service Architecture

### Directory Structure

```
packages/api/src/services/search/
├── search.service.ts         # Main search orchestration
├── meilisearch.client.ts     # Meilisearch connection singleton
├── indexers/
│   ├── message.indexer.ts    # Index messages on create/update/delete
│   ├── user.indexer.ts       # Index users on profile change
│   └── server.indexer.ts     # Index servers on settings change
└── __tests__/
    └── search.service.test.ts
```

### Indexing Strategy

**Real-time Indexing:**
- Messages: Index on `MESSAGE_CREATE`, update on `MESSAGE_UPDATE`, delete on `MESSAGE_DELETE`
- Users: Index on profile update
- Servers: Index on settings change, member count updates

**Sync Mechanism:**
- Hook into existing services (message.service, user routes, server.service)
- Fire-and-forget indexing (don't block main operations)

### Search Service Methods

```typescript
class SearchService {
  // Message search with filters
  searchMessages(query, options: { channelId?, serverId?, authorId?, limit, offset })

  // User search (for mentions, invites)
  searchUsers(query, options: { limit, offset })

  // Server search (for discovery)
  searchServers(query, options: { category?, minMembers?, limit, offset })

  // Autocomplete (prefix search)
  autocomplete(type: 'messages' | 'users' | 'servers', prefix, limit)

  // Index management
  syncIndex(type: 'messages' | 'users' | 'servers')
}
```

## REST API Endpoints

### Search Routes (`/api/v1/search`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/search/messages` | Search messages with filters |
| POST | `/api/v1/search/users` | Search users (for mentions, friend requests) |
| POST | `/api/v1/search/servers` | Search servers (discovery) |
| GET | `/api/v1/search/autocomplete` | Autocomplete suggestions |

### Server Discovery Routes (`/api/v1/discovery`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/discovery/servers` | List servers in directory |
| GET | `/api/v1/discovery/servers/:serverId/preview` | Get server preview |
| GET | `/api/v1/discovery/categories` | List available categories |
| GET | `/api/v1/discovery/popular` | Get popular servers |

### Response Format

```typescript
interface SearchResponse<T> {
  results: T[];
  total: number;
  limit: number;
  offset: number;
  query_time_ms: number;
}
```

## Database Schema

### server_discovery_settings Table

```sql
CREATE TABLE server_discovery_settings (
  server_id VARCHAR(20) PRIMARY KEY REFERENCES servers(id),
  is_discoverable BOOLEAN DEFAULT false,
  category VARCHAR(50),
  tags TEXT[],
  discovery_description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### search_analytics Table (Optional)

```sql
CREATE TABLE search_analytics (
  id VARCHAR(20) PRIMARY KEY,
  query TEXT NOT NULL,
  search_type VARCHAR(20),
  results_count INTEGER,
  user_id VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Server Categories

```typescript
const SERVER_CATEGORIES = [
  'gaming', 'music', 'education', 'science_tech',
  'entertainment', 'hobbies', 'community', 'finance'
] as const;
```

### Discovery Sorting Options

- `member_count` - Most members (default)
- `recent` - Recently active
- `relevance` - Search relevance score

## Implementation Sequence

### Step 1: Infrastructure Setup
1. Add Meilisearch to docker-compose.yml
2. Install `meilisearch` package
3. Create Meilisearch client singleton
4. Create database migrations

### Step 2: Core Search Service
1. Implement search.service.ts
2. Implement indexers for messages, users, servers
3. Hook indexers into existing services

### Step 3: Search API Routes
1. Create `/api/v1/search/*` routes
2. Add validation schemas to shared package
3. Wire up to search service

### Step 4: Server Discovery
1. Create `/api/v1/discovery/*` routes
2. Implement server preview logic
3. Add category/tag filtering

### Step 5: Testing & Validation
1. Unit tests for search service
2. Integration tests for search routes
3. Verify compilation and runtime

## Testing Strategy

```typescript
describe('SearchService', () => {
  it('should search messages by content');
  it('should filter messages by channel');
  it('should paginate results');
  it('should autocomplete user names');
});

describe('Discovery Routes', () => {
  it('should list discoverable servers');
  it('should filter by category');
  it('should sort by member count');
  it('should return server preview for non-members');
});
```

## Acceptance Criteria

- [ ] Meilisearch running in Docker
- [ ] Messages searchable after creation
- [ ] Users searchable by username
- [ ] Servers searchable and discoverable
- [ ] Autocomplete working
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] API runs successfully
