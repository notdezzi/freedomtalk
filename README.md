# FreedomTalk

A modern, open-source Discord clone built with cutting-edge technologies.

## Overview

FreedomTalk is a real-time communication platform featuring text chat, voice calls, video calls, and server/channel organization. Built as a monorepo with multiple client applications (web, desktop, mobile) sharing a common backend API.

## Technology Stack

### Backend
- **Fastify 5.x** - High-performance web framework
- **Socket.io 4.x** - Real-time WebSocket communication
- **PostgreSQL 16+** - Primary database
- **Redis 7+** - Caching and pub/sub
- **RabbitMQ** - Message queue
- **TypeScript** - Type-safe development

### Frontend (Web)
- **Next.js 16.x** - React framework with App Router
- **React 19.x** - UI library
- **Tailwind CSS 4.x** - Utility-first CSS
- **Zustand** - State management
- **Socket.io Client** - Real-time communication

### Infrastructure
- **Docker** - Containerization for local development
- **npm Workspaces** - Monorepo management

## Project Structure

```
freedomtalk/
├── packages/
│   ├── api/        # Backend API server (Fastify)
│   ├── web/        # Web application (Next.js)
│   ├── desktop/    # Desktop app (Electron) - Placeholder
│   ├── mobile/     # Mobile app (React Native) - Placeholder
│   ├── shared/     # Shared types, schemas, and utilities
│   └── scripts/    # Development and deployment scripts
├── docker-compose.yml  # Local development infrastructure
├── package.json        # Root package configuration
└── tsconfig.json       # Root TypeScript configuration
```

## Getting Started

### Prerequisites

- **Node.js** 20.0.0 or higher
- **npm** 11.0.0 or higher
- **Docker** and **Docker Compose** (for local infrastructure)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd freedomtalk
```

2. Install dependencies:
```bash
npm install
```

3. Start infrastructure services:
```bash
docker-compose up -d
```

4. Set up environment variables:
```bash
# API
cp packages/api/.env.example packages/api/.env

# Web
cp packages/web/.env.example packages/web/.env.local
```

5. Update the `.env` files with your configuration

### Development

Run all packages in development mode:
```bash
npm run dev
```

Or run individual packages:
```bash
# API server
npm run dev --workspace=@freedomtalk/api

# Web application
npm run dev --workspace=@freedomtalk/web
```

### Building

Build all packages:
```bash
npm run build
```

Build individual packages:
```bash
npm run build --workspace=@freedomtalk/api
npm run build --workspace=@freedomtalk/web
npm run build --workspace=@freedomtalk/shared
```

## Available Scripts

- `npm run dev` - Start all packages in development mode
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean all build artifacts

## Packages

### [@freedomtalk/api](./packages/api)
Backend API server built with Fastify. Handles authentication, real-time messaging, and data persistence.

### [@freedomtalk/web](./packages/web)
Web application built with Next.js. Provides the main user interface for FreedomTalk.

### [@freedomtalk/shared](./packages/shared)
Shared code (types, schemas, constants, utilities) used across all packages.

### [@freedomtalk/desktop](./packages/desktop)
Desktop application (Electron) - Placeholder for future development.

### [@freedomtalk/mobile](./packages/mobile)
Mobile application (React Native) - Placeholder for future development.

### [@freedomtalk/scripts](./packages/scripts)
Development and deployment scripts.

## Infrastructure

See [DOCKER.md](./DOCKER.md) for detailed Docker setup and usage instructions.

### Services

- **PostgreSQL** - Port 5432
- **Redis** - Port 6379
- **RabbitMQ** - Ports 5672 (AMQP), 15672 (Management UI)

## Development Workflow

1. Create a feature branch
2. Make your changes
3. Run linting and type checking: `npm run lint && npm run type-check`
4. Build all packages: `npm run build`
5. Test your changes
6. Commit and push
7. Create a pull request

## Project Status

🚧 **In Development** - This project is currently in the initial setup phase (Milestone 1.1).

### Completed
- ✅ Monorepo structure with npm workspaces
- ✅ Backend API package with Fastify
- ✅ Frontend web package with Next.js
- ✅ Shared package for common code
- ✅ Docker configuration for local development
- ✅ TypeScript configuration across all packages
- ✅ ESLint and Prettier setup

### Upcoming
- Database schema and migrations
- User authentication and authorization
- Real-time messaging
- Voice and video calls
- File sharing
- And much more...

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]

