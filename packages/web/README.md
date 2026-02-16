# @freedomtalk/web

Web application for FreedomTalk built with Next.js 14+.

## Technology Stack

- **Next.js 16.x** - React framework with App Router
- **React 19.x** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4.x** - Utility-first CSS framework
- **Zustand** - State management
- **Socket.io Client** - Real-time WebSocket communication
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Lucide React** - Icon library

## Development

### Prerequisites

- Node.js 20.0.0 or higher

### Setup

1. Copy the environment template:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your configuration

3. Install dependencies (from project root):
```bash
npm install
```

4. Run in development mode:
```bash
npm run dev --workspace=@freedomtalk/web
```

The web app will start on `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Remove build artifacts

## Project Structure

```
app/                # Next.js App Router pages
components/         # React components
├── ui/            # Reusable UI components
hooks/             # Custom React hooks
lib/               # Library code and utilities
├── utils/         # Utility functions
stores/            # Zustand state stores
public/            # Static assets
```

## Features

The web application will include:

- User authentication and registration
- Real-time messaging
- Server and channel management
- Voice and video calls
- File sharing
- User presence and status
- Notifications

Features will be implemented in future milestones.

## Styling

This project uses Tailwind CSS 4.x for styling:

- Utility-first CSS approach
- Dark mode support
- Responsive design
- Custom theme configuration in `app/globals.css`

## State Management

Zustand is used for global state management:

- Lightweight and performant
- TypeScript-first
- No boilerplate
- DevTools support

## Real-time Communication

Socket.io client is configured for real-time features:

- WebSocket connection to API server
- Automatic reconnection
- Event-based communication
- Type-safe events (via shared package)

## Environment Variables

See `.env.example` for all available configuration options.

All client-side environment variables must be prefixed with `NEXT_PUBLIC_`.
