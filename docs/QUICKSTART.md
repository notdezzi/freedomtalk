# Quickstart

## Workspace

FreedomTalk is an npm workspace monorepo. The active application packages live in `packages/`.

## Common Commands

```bash
npm install
npm run docker:up
npm run dev
```

## Key Locations

- `packages/api` - Fastify API server
- `packages/web` - Next.js web application
- `packages/shared` - shared code and types
- `packages/scripts` - maintenance and support scripts
- `tests` - API and Playwright coverage
- `docs` - project documentation

## More Docs

- Docker setup: [`setup/docker.md`](./setup/docker.md)
- Architecture: [`architecture/implementation-planning.md`](./architecture/implementation-planning.md)
- Tech stack: [`architecture/tech-stack.md`](./architecture/tech-stack.md)
- Beads workflow: [`process/beads.md`](./process/beads.md)
