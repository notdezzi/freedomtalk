# @freedomtalk/api

Backend API server for FreedomTalk built with Fastify.

## Technology Stack

- **Fastify 5.x** - High-performance web framework
- **Socket.io 4.x** - Real-time WebSocket communication
- **PostgreSQL** - Primary database (via `pg` client)
- **Redis 4.x** - Caching, sessions, and pub/sub
- **Pino** - Fast, structured logging
- **Zod** - Schema validation
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Sharp** - Image processing
- **Multer** - File upload handling

## Development

### Prerequisites

- Node.js 20.0.0 or higher
- PostgreSQL 16+ (via Docker or local installation)
- Redis 7+ (via Docker or local installation)

### Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration

3. Start infrastructure services:
```bash
# From project root
docker-compose up -d
```

4. Install dependencies (from project root):
```bash
npm install
```

5. Run in development mode:
```bash
npm run dev --workspace=@freedomtalk/api
```

The API server will start on `http://localhost:3001`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Remove build artifacts

## Project Structure

```
src/
├── config/         # Configuration files (database, Redis, logger)
├── routes/         # API route handlers
├── services/       # Business logic services
├── middleware/     # Fastify middleware
├── models/         # Data models and types
├── utils/          # Utility functions
└── index.ts        # Application entry point
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### API Info
- `GET /api/v1` - API information

Additional endpoints will be added as features are implemented.

## Environment Variables

See `.env.example` for all available configuration options.

## Database

The API uses PostgreSQL with connection pooling. Database migrations and schema management will be added in future milestones.

## Logging

Structured logging is provided by Pino:
- Pretty-printed logs in development
- JSON logs in production
- Configurable log levels via `LOG_LEVEL` environment variable

## Error Handling

The server includes:
- Graceful shutdown handlers
- Uncaught exception handling
- Unhandled rejection handling
- Automatic infrastructure cleanup on shutdown

