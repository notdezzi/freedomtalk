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

### Documentation
- **Swagger UI:** `http://localhost:3000/docs` - Interactive API documentation
- **API Usage Guide:** See [docs/API_USAGE.md](./docs/API_USAGE.md) for detailed examples

### Health Check
- `GET /health` - Server health status

### Authentication (`/api/v1/auth`)
- `POST /register` - Register a new user
- `POST /login` - Authenticate and receive tokens
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout and invalidate session
- `GET /google/authorize` - Initiate Google OAuth2 flow
- `GET /google/callback` - Handle Google OAuth2 callback
- `GET /github/authorize` - Initiate GitHub OAuth2 flow
- `GET /github/callback` - Handle GitHub OAuth2 callback
- `GET /session` - Get current session information

### Users (`/api/v1/users`)
- `GET /@me` - Get current user profile (requires auth)
- `PUT /@me` - Update current user profile (requires auth)

For detailed request/response examples, see the [API Usage Guide](./docs/API_USAGE.md).

## Environment Variables

See `.env.example` for all available configuration options.

### Key Configuration

- **JWT_PRIVATE_KEY / JWT_PUBLIC_KEY** - RS256 key pair for JWT signing
- **SESSION_ENCRYPTION_KEY** - AES-256-GCM key for session encryption
- **COOKIE_SECRET** - Secret for cookie signing
- **RATE_LIMIT_MAX** - Maximum requests per time window (default: 100)
- **RATE_LIMIT_WINDOW** - Rate limit time window (default: 1 minute)
- **SWAGGER_ENABLED** - Enable/disable Swagger UI (default: true in development)
- **GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET** - Google OAuth2 credentials
- **GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET** - GitHub OAuth2 credentials

## Database

The API uses PostgreSQL with connection pooling. Database migrations and schema management will be added in future milestones.

## Logging

Structured logging is provided by Pino:
- Pretty-printed logs in development
- JSON logs in production
- Configurable log levels via `LOG_LEVEL` environment variable

## Features

### Authentication & Security
- **JWT Authentication** - RS256 algorithm with access/refresh tokens
- **OAuth2 Integration** - Google and GitHub authentication
- **Token Rotation** - Automatic refresh token rotation for enhanced security
- **Session Management** - AES-256-GCM encrypted sessions in Redis
- **Password Hashing** - bcrypt with configurable salt rounds
- **Rate Limiting** - Redis-backed rate limiting per endpoint
- **Redirect URI Validation** - Protection against open redirect attacks

### API Infrastructure
- **Swagger Documentation** - Auto-generated OpenAPI documentation
- **Standardized Responses** - Consistent API response format
- **Global Error Handling** - Centralized error handling with proper status codes
- **Request Validation** - Zod schema validation for all inputs
- **Transaction Support** - Atomic database operations using Knex transactions

### Data Integrity
- **Atomic User Creation** - User and profile created in single transaction
- **Conflict Detection** - Duplicate email/username checking
- **Profile Management** - Transaction-based profile updates

## Error Handling

The server includes:
- Graceful shutdown handlers
- Uncaught exception handling
- Unhandled rejection handling
- Automatic infrastructure cleanup on shutdown
- Standardized error responses with error codes
- Detailed validation error messages

