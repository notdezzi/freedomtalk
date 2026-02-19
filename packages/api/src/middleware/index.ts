/**
 * Middleware Exports
 * Central export point for all Fastify middleware
 */

// Authentication middleware
export { requireAuth, optionalAuth, type AuthUser } from './auth.middleware';

// Permission middleware
export {
  requireServerPermission,
  requireChannelPermission,
  attachPermissionService,
  permissionPlugin,
  permissionMiddleware,
} from './permission.middleware';
