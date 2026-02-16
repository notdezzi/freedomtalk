# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FreedomTalk is a Discord clone built as a monorepo using npm workspaces. The project uses a microservices-style architecture with a shared package for types, schemas, and utilities.

**Core Tech Stack:**
- **Backend**: Fastify 5.x + Socket.io 4.x + PostgreSQL + Redis
- **Frontend**: Next.js 16.x (App Router) + React 19.x + Tailwind CSS 4.x + Zustand
- **Database**: PostgreSQL (using Knex for query building)
- **Testing**: Vitest
- **Infrastructure**: Docker Compose (PostgreSQL, Redis, RabbitMQ)

## Development Commands

### Root Level
```bash
npm run dev              # Start all packages in development mode
npm run build            # Build all packages
npm run start            # Start all packages (production)
npm run lint            # Lint all packages
npm run lint:fix        # Lint and auto-fix all packages
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking
npm run clean           # Clean build artifacts

# Docker infrastructure
npm run docker:up       # Start Docker services (PostgreSQL, Redis, RabbitMQ)
npm run docker:down     # Stop Docker services
npm run docker:logs     # View Docker logs
```

### API Package (`packages/api`)
```bash
# Development
npm run dev --workspace=@freedomtalk/api    # Start API with tsx watch

# Database migrations
npm run migrate:make --workspace=@freedomtalk/api    # Create new migration
npm run migrate:latest --workspace=@freedomtalk/api  # Run pending migrations
npm run migrate:rollback --workspace=@freedomtalk/api # Rollback last migration
npm run migrate:status --workspace=@freedomtalk/api  # Check migration status

# Database seeds
npm run seed:make --workspace=@freedomtalk/api    # Create new seed
npm run seed:run --workspace=@freedomtalk/api    # Run seeds

# Testing
npm run test --workspace=@freedomtalk/api              # Run tests once
npm run test:watch --workspace=@freedomtalk/api      # Watch mode
npm run test:coverage --workspace=@freedomtalk/api    # Coverage report
npm run test:ui --workspace=@freedomtalk/api        # UI test runner
```

### Web Package (`packages/web`)
```bash
npm run dev --workspace=@freedomtalk/web    # Start Next.js with Turbopack
npm run build --workspace=@freedomtalk/web  # Build for production
npm run start --workspace=@freedomtalk/web  # Start production server
```

## Architecture

### Monorepo Structure

```
freedomtalk/
├── packages/
│   ├── api/        # Backend API (Fastify + Socket.io)
│   ├── web/        # Frontend (Next.js App Router)
│   ├── shared/     # Shared types, schemas, constants, utilities
│   ├── desktop/    # Placeholder (Electron)
│   ├── mobile/     # Placeholder (React Native)
│   └── scripts/    # Deployment scripts
```

### Backend Architecture (`packages/api`)

**Layered Architecture:**
1. **Routes** (`src/routes/`) - HTTP endpoints organized by domain
   - `auth/` - Authentication endpoints
   - `users/` - User management
   - `messages/` - Message CRUD
   - `reactions.routes.ts` - Message reactions
   - `attachments.routes.ts` - File attachments
   - `websocket/` - WebSocket HTTP endpoints
   - Routes use Fastify's plugin system with prefixes: `/api/v1/*`

2. **Services** (`src/services/`) - Business logic layer
   - `auth/` - Authentication, JWT, 2FA
   - `message/` - Message operations and storage
   - `attachment/` - File upload/download via MinIO/S3
   - `embed/` - Open Graph metadata extraction
   - `reaction/` - Reaction operations
   - `websocket/` - Real-time communication:
     - `websocket.server.ts` - Singleton Socket.io server wrapper
     - `handlers/` - Event handlers (connection, message, reaction, presence, room)
     - `managers/` - State management (connection, room, presence, typing, status, subscription)
     - `message.broadcaster.ts` - Broadcasting logic
     - `message.router.ts` - Message routing

3. **Middleware** (`src/middleware/`) - Request processing
   - `auth.middleware.ts` - JWT and session authentication
   - `csrf.middleware.ts` - CSRF protection
   - `error.middleware.ts` - Centralized error handling
   - `validation.middleware.ts` - Zod schema validation

4. **Config** (`src/config/`) - Infrastructure setup
   - `database.ts` - PostgreSQL pool + Knex instance
   - `redis.ts` - Redis client
   - `websocket.ts` - WebSocket configuration

**Database:**
- PostgreSQL with Knex for query building and migrations
- Migrations in `packages/api/migrations/` (created with `npm run migrate:make`)
- Seeding with `npm run seed:run`
- Snowflake IDs for primary keys (20-character strings)

**WebSocket:**
- Socket.io with Redis adapter for horizontal scaling
- Singleton `wsServer` instance in `services/websocket/websocket.server.ts`
- Event handlers registered via `registerHandlers()`
- Room-based subscriptions for channels
- Presence, typing indicators, status management

### Frontend Architecture (`packages/web`)

**Next.js App Router structure:**
- `app/` - App Router pages and layouts
- `components/` - Reusable UI components
- `stores/` - Zustand state stores
- `hooks/` - Custom React hooks
- `lib/` - Utilities and API clients

**State Management:**
- Zustand for global state
- Socket.io-client for real-time updates

### Shared Package (`packages/shared`)

**Exports from `@freedomtalk/shared`:**
- `types/` - TypeScript interfaces (User, Message, Channel, Server)
- `schemas/` - Zod validation schemas (auth, messages, reactions)
- `constants/` - Validation constants (password length, message limits)
- `utils/` - Shared utilities

**Key Schema Usage:**
- Input validation in API routes via `validation.middleware.ts`
- Type inference: `z.infer<typeof schemaName>` generates TypeScript types

## Infrastructure

### Docker Services
```bash
docker-compose up -d    # Start: PostgreSQL (5432), Redis (6379), RabbitMQ (5672, 15672)
```

**Service Details:**
- PostgreSQL: `timescale/timescaledb:latest-pg16` (supports time-series data)
- Redis: `redis:7-alpine` with AOF persistence
- RabbitMQ: `rabbitmq:3-management-alpine` with admin UI at http://localhost:15672

**Environment Variables:**
- API: `packages/api/.env` (copy from `.env.example`)
- Web: `packages/web/.env.local` (copy from `.env.example`)
- Key vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`

## Testing

**API Testing (Vitest):**
- Test files: `src/**/__tests__/*.test.ts`
- Run: `npm run test --workspace=@freedomtalk/api`
- Coverage: `npm run test:coverage --workspace=@freedomtalk/api`
- UI runner: `npm run test:ui --workspace=@freedomtalk/api`

**Test Setup:**
- `packages/api/src/test-setup.ts` - Test configuration and helpers
- Use `supertest` for HTTP endpoint testing
- Use in-memory database for integration tests (configure via env)

## Important Patterns

### ID System
- Snowflake IDs for all entities (20-character strings)
- Format: `[timestamp][worker][sequence]`
- Enables sorting by creation time and distributed generation

### Authentication Flow
1. JWT tokens stored in httpOnly cookies
2. Socket.io authenticated via middleware using JWT
3. Refresh token flow for long-lived sessions
4. Optional 2FA (TOTP) via `speakeasy`

### WebSocket Event Flow
1. Client emits event (e.g., `MESSAGE_CREATE`)
2. `auth.middleware.ts` authenticates socket
3. Handler processes event (e.g., `handleMessageCreate`)
4. Service performs business logic
5. Changes broadcast via Redis adapter to all server instances
6. Clients receive updates in subscribed rooms

### Error Handling
- Centralized in `middleware/error.middleware.ts`
- Errors follow `ApiResponse<T>` format from shared schemas
- HTTP status codes mapped appropriately

### Migration Pattern
```bash
npm run migrate:make --workspace=@freedomtalk/api create_users_table
# Edit generated migration in migrations/
npm run migrate:latest --workspace=@freedomtalk/api
```

### API Route Pattern
```typescript
import { FastifyInstance } from 'fastify';

export default async function routes(app: FastifyInstance) {
  // Get endpoint
  app.get('/:id', { onRequest: [authenticate] }, async (req, reply) => {
    // Handler logic
  });

  // Post endpoint with validation
  app.post('/', {
    onRequest: [authenticate],
    schema: {
      body: createMessageSchema
    }
  }, async (req, reply) => {
    // Handler logic
  });
}
```

## Common Gotchas

1. **Database Pool**: Connection pool closes on `closePool()` - call during shutdown
2. **WebSocket Singleton**: Always use `wsServer.getIO()` after initialization
3. **Rate Limiting**: In-memory store (not distributed) - update for multi-instance deployment
4. **CORS**: Configure `CORS_ORIGIN` env var for frontend access
5. **TypeScript Build**: Run `npm run type-check` before committing
6. **Knex**: Use `db` instance for queries, not `pool` directly

## API Documentation

- Swagger UI available at `http://localhost:3001/docs` when API is running
- OpenAPI spec auto-generated from route schemas
- Bearer auth and cookie auth configured
