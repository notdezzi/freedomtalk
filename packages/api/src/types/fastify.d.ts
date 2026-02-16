/**
 * Fastify type extensions
 * Extends Fastify types with cookie support and custom properties
 */

import '@fastify/cookie';
import { FastifyRequest as OriginalFastifyRequest, FastifyReply as OriginalFastifyReply } from 'fastify';

/**
 * User object attached to request after authentication
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  email_verified: boolean;
  mfa_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Authenticated user (populated by auth middleware)
     */
    user?: AuthenticatedUser;

    /**
     * Session ID (populated by auth middleware when MFA is verified)
     */
    sessionId?: string;

    /**
     * Cookies object (provided by @fastify/cookie plugin)
     */
    cookies: { [cookieName: string]: string | undefined };
  }

  interface FastifyReply {
    /**
     * Set a cookie
     * @param name - Cookie name
     * @param value - Cookie value
     * @param options - Cookie options
     */
    setCookie(
      name: string,
      value: string,
      options?: {
        domain?: string;
        path?: string;
        expires?: Date;
        maxAge?: number;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none' | boolean;
        signed?: boolean;
      }
    ): this;

    /**
     * Clear a cookie
     * @param name - Cookie name
     * @param options - Cookie options
     */
    clearCookie(
      name: string,
      options?: {
        domain?: string;
        path?: string;
      }
    ): this;
  }
}

