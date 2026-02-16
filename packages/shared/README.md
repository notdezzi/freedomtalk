# @freedomtalk/shared

Shared types, constants, schemas, and utilities for the FreedomTalk project.

## Purpose

This package contains code that is shared across multiple packages (API, Web, Desktop, Mobile):

- **Types**: TypeScript interfaces and types
- **Constants**: Shared constants (API routes, WebSocket events, validation rules)
- **Schemas**: Zod validation schemas
- **Utilities**: Common utility functions

## Technology Stack

- **TypeScript** - Type-safe development
- **Zod** - Schema validation

## Usage

Import from other packages:

```typescript
// Import types
import { User, Message, Channel, Server } from '@freedomtalk/shared';

// Import constants
import { API_ROUTES, WS_EVENTS, VALIDATION } from '@freedomtalk/shared';

// Import schemas
import { loginSchema, registerSchema, createMessageSchema } from '@freedomtalk/shared';

// Import utilities
import { formatDate, truncate, generateId } from '@freedomtalk/shared';
```

## Development

### Available Scripts

- `npm run build` - Build the package
- `npm run dev` - Build in watch mode
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Remove build artifacts

### Adding New Shared Code

1. Add your code to the appropriate directory:
   - `src/types/` - TypeScript types and interfaces
   - `src/constants/` - Constants
   - `src/schemas/` - Zod schemas
   - `src/utils/` - Utility functions

2. Export from the module's `index.ts`

3. Re-export from `src/index.ts` if needed

4. Build the package:
```bash
npm run build --workspace=@freedomtalk/shared
```

## Package Structure

```
src/
├── types/          # TypeScript types and interfaces
├── constants/      # Shared constants
├── schemas/        # Zod validation schemas
├── utils/          # Utility functions
└── index.ts        # Main export file
```

## Best Practices

- **Keep it lean**: Only add code that is truly shared across multiple packages
- **Type safety**: Use TypeScript for all code
- **Validation**: Use Zod for runtime validation
- **Documentation**: Document complex types and functions
- **Testing**: Add tests for utility functions (future milestone)

## Examples

### Using Validation Schemas

```typescript
import { loginSchema } from '@freedomtalk/shared';

const result = loginSchema.safeParse({
  email: 'user@example.com',
  password: 'password123',
});

if (result.success) {
  // Data is valid
  const { email, password } = result.data;
} else {
  // Handle validation errors
  console.error(result.error);
}
```

### Using Constants

```typescript
import { API_ROUTES, WS_EVENTS } from '@freedomtalk/shared';

// API routes
const loginUrl = API_ROUTES.AUTH.LOGIN;
const userUrl = API_ROUTES.USERS.BY_ID('user-123');

// WebSocket events
socket.on(WS_EVENTS.MESSAGE_CREATE, handleMessage);
```

### Using Utilities

```typescript
import { formatDate, truncate } from '@freedomtalk/shared';

const formatted = formatDate(new Date());
const short = truncate('Long message...', 50);
```

