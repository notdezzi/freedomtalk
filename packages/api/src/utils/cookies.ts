/**
 * Secure Cookie Utilities
 * 
 * Provides utilities for setting, getting, and deleting secure cookies
 * with encryption support for sensitive data.
 */

import crypto from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../config/logger';

/**
 * Cookie options interface
 */
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
  maxAge?: number;
  expires?: Date;
}

/**
 * Default secure cookie options
 */
const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

/**
 * Encryption key for cookies
 */
let encryptionKey: Buffer | null = null;

/**
 * Initialize encryption key
 */
function getEncryptionKey(): Buffer {
  if (!encryptionKey) {
    const keyHex = process.env.COOKIE_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      const error = 'COOKIE_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)';
      logger.error(error);
      throw new Error(error);
    }
    encryptionKey = Buffer.from(keyHex, 'hex');
  }
  return encryptionKey;
}

/**
 * Encrypt cookie value
 * @param value - Value to encrypt
 * @returns Encrypted string in format: iv:encrypted:authTag
 */
export function encryptCookie(value: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt cookie value
 * @param encrypted - Encrypted string in format: iv:encrypted:authTag
 * @returns Decrypted value
 */
export function decryptCookie(encrypted: string): string | null {
  try {
    const key = getEncryptionKey();
    const parts = encrypted.split(':');

    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      logger.warn('Invalid encrypted cookie format');
      return null;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted: string = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error({ error }, 'Error decrypting cookie');
    return null;
  }
}

/**
 * Set secure cookie
 * @param reply - Fastify reply object
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function setSecureCookie(
  reply: FastifyReply,
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const cookieOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...options,
  };

  // Add domain if configured
  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  reply.setCookie(name, value, cookieOptions);
}

/**
 * Set encrypted secure cookie
 * @param reply - Fastify reply object
 * @param name - Cookie name
 * @param value - Cookie value (will be encrypted)
 * @param options - Cookie options
 */
export function setEncryptedCookie(
  reply: FastifyReply,
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const encrypted = encryptCookie(value);
  setSecureCookie(reply, name, encrypted, options);
}

/**
 * Get cookie value
 * @param request - Fastify request object
 * @param name - Cookie name
 * @returns Cookie value or undefined
 */
export function getSecureCookie(
  request: FastifyRequest,
  name: string
): string | undefined {
  return request.cookies?.[name];
}

/**
 * Get encrypted cookie value
 * @param request - Fastify request object
 * @param name - Cookie name
 * @returns Decrypted cookie value or null
 */
export function getEncryptedCookie(
  request: FastifyRequest,
  name: string
): string | null {
  const encrypted = request.cookies?.[name];
  if (!encrypted) {
    return null;
  }
  return decryptCookie(encrypted);
}

/**
 * Delete cookie
 * @param reply - Fastify reply object
 * @param name - Cookie name
 */
export function deleteSecureCookie(
  reply: FastifyReply,
  name: string
): void {
  reply.clearCookie(name, {
    path: '/',
    domain: process.env.COOKIE_DOMAIN,
  });
}

