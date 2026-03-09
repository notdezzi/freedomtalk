<p align="center">
  <h1 align="center">FreedomTalk</h1>
  <p align="center"><strong>Own Your Conversations.</strong></p>
  <p align="center">The open-source communication platform that gives you control.</p>
</p>

---

## Why FreedomTalk?

Tired of proprietary platforms that monetize your conversations? **FreedomTalk** is your answer.

Built for communities that value **privacy, transparency, and control**, FreedomTalk delivers enterprise-grade real-time communication without the vendor lock-in.

### What You Get

| Feature | Description |
|---------|-------------|
| **Real-Time Messaging** | Instant text chat with Markdown support, reactions, and attachments |
| **Voice & Video Calls** | Crystal-clear calls directly in your browser or desktop app |
| **Server & Channel Organization** | Flexible structure for communities of any size |
| **Self-Hosted** | Deploy on your infrastructure. Your data, your rules. |
| **Modern Architecture** | Built on cutting-edge tech for reliability and scale |

---

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| [Fastify 5.x](https://fastify.dev/) | High-performance web framework |
| [Socket.io 4.x](https://socket.io/) | Real-time WebSocket communication |
| [PostgreSQL 16+](https://www.postgresql.org/) | Reliable data persistence |
| [Redis 7+](https://redis.io/) | Caching and pub/sub |
| [RabbitMQ](https://rabbitmq.com/) | Message queue for scalability |
| TypeScript | Type-safe development |

### Frontend

| Technology | Purpose |
|------------|---------|
| [Next.js 16.x](https://nextjs.org/) | React framework with App Router |
| [React 19.x](https://react.dev/) | Modern UI development |
| [Tailwind CSS 4.x](https://tailwindcss.com/) | Utility-first styling |
| [Zustand](https://zustand-demo.pmnd.rs/) | Lightweight state management |
| Socket.io Client | Real-time updates |

### Infrastructure

- **Docker** - Containerized development environment
- **npm Workspaces** - Monorepo management

---

## Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** 20.0.0+
- **npm** 11.0.0+
- **Docker** & **Docker Compose**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd freedomtalk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```

4. **Configure environment variables**
   ```bash
   # API configuration
   cp packages/api/.env.example packages/api/.env

   # Web application configuration
   cp packages/web/.env.example packages/web/.env.local
   ```

   > Update the `.env` files with your specific configuration before proceeding.

5. **Launch development servers**
   ```bash
   npm run dev
   ```

Your FreedomTalk instance is now running.

---

## Project Structure

```
freedomtalk/
├── packages/
│   ├── api/          # Backend API server (Fastify + Socket.io)
│   ├── web/          # Web application (Next.js)
│   ├── shared/       # Shared types, schemas, and utilities
│   ├── desktop/      # Desktop app (Electron) — Coming Soon
│   ├── mobile/       # Mobile app (React Native) — Coming Soon
│   └── scripts/      # Development and deployment scripts
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Available Commands

### Root Level

```bash
npm run dev              # Start all packages in development mode
npm run build            # Build all packages for production
npm run start            # Start production servers
npm run lint             # Run ESLint across all packages
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
npm run clean            # Remove build artifacts
```

### Docker Infrastructure

```bash
npm run docker:up        # Start PostgreSQL, Redis, RabbitMQ
npm run docker:down      # Stop all services
npm run docker:logs      # View service logs
```

### API Package

```bash
npm run dev --workspace=@freedomtalk/api           # Development server
npm run migrate:latest --workspace=@freedomtalk/api # Run migrations
npm run migrate:make --workspace=@freedomtalk/api   # Create migration
npm run test --workspace=@freedomtalk/api           # Run tests
```

### Web Package

```bash
npm run dev --workspace=@freedomtalk/web           # Development with Turbopack
npm run build --workspace=@freedomtalk/web         # Production build
npm run start --workspace=@freedomtalk/web         # Production server
```

---

## Roadmap

### Shipped

- [x] Monorepo architecture with npm workspaces
- [x] Backend API with Fastify
- [x] Frontend application with Next.js
- [x] Shared package for types and utilities
- [x] Docker development environment
- [x] TypeScript configuration
- [x] Code quality tooling (ESLint, Prettier)

### In Progress

- [ ] Database schema and migrations
- [ ] User authentication and authorization
- [ ] Real-time messaging system
- [ ] Voice and video calling
- [ ] File sharing and attachments

### Planned

- [ ] Desktop application (Electron)
- [ ] Mobile application (React Native)
- [ ] Plugin/extension system
- [ ] Self-hosting deployment guides

---

## Infrastructure Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching and pub/sub |
| RabbitMQ | 5672 | Message queue |
| RabbitMQ Management | 15672 | Admin UI at `http://localhost:15672` |

For detailed Docker configuration, see [docs/setup/docker.md](./docs/setup/docker.md).

Documentation is organized under [`docs/`](./docs):
- Setup and environment guides: [`docs/setup`](./docs/setup)
- Architecture and implementation planning: [`docs/architecture`](./docs/architecture)
- Product and roadmap docs: [`docs/product`](./docs/product) and [`docs/roadmap`](./docs/roadmap)
- Historical notes and superseded planning: [`docs/archive`](./docs/archive)

---

## Development Workflow

1. Create a feature branch from `main`
2. Implement your changes
3. Run quality checks:
   ```bash
   npm run lint && npm run type-check
   ```
4. Build all packages:
   ```bash
   npm run build
   ```
5. Test your changes thoroughly
6. Commit and push
7. Open a pull request

---

## Contributing

We welcome contributions from the community. Whether you're fixing bugs, adding features, or improving documentation — your help makes FreedomTalk better for everyone.

Contributing guidelines will be added soon.

---

## License

License information to be announced.

---

<p align="center">
  <strong>FreedomTalk</strong> — Because your conversations deserve freedom.
</p>
