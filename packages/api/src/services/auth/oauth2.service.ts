/**
 * OAuth2 Base Service
 * 
 * Abstract base class for OAuth2 providers (Google, GitHub, etc.)
 * Implements common OAuth2 flows with CSRF protection via state parameter.
 */

import crypto from 'crypto';
import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';

/**
 * OAuth2 token response
 */
export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

/**
 * OAuth2 user profile
 */
export interface OAuth2UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  emailVerified?: boolean;
}

/**
 * Abstract OAuth2 base service
 */
export abstract class OAuth2BaseService {
  protected abstract clientId: string;
  protected abstract clientSecret: string;
  protected abstract redirectUri: string;
  protected abstract authorizationUrl: string;
  protected abstract tokenUrl: string;
  protected abstract scope: string;

  /**
   * Abstract method to get user profile from OAuth2 provider
   * Must be implemented by each provider
   */
  protected abstract getUserProfile(accessToken: string): Promise<OAuth2UserProfile>;

  /**
   * Generate CSRF state parameter
   * @returns Random state string
   */
  protected generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Save state to Redis with 10 minute expiry
   * @param state - State parameter to save
   */
  protected async saveState(state: string): Promise<void> {
    await redisClient.setEx(`oauth_state:${state}`, 600, '1'); // 10 minutes
  }

  /**
   * Validate state parameter (single-use)
   * @param state - State parameter to validate
   * @returns True if valid, false otherwise
   */
  protected async validateState(state: string): Promise<boolean> {
    const exists = await redisClient.get(`oauth_state:${state}`);
    if (exists) {
      // Delete state after validation (single-use)
      await redisClient.del(`oauth_state:${state}`);
      return true;
    }
    return false;
  }

  /**
   * Get authorization URL with state parameter
   * @param state - Optional state parameter (generated if not provided)
   * @returns Authorization URL
   */
  async getAuthorizationUrl(state?: string): Promise<string> {
    const stateParam = state || this.generateState();
    await this.saveState(stateParam);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: stateParam,
      response_type: 'code',
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param code - Authorization code from OAuth2 provider
   * @returns Token response
   */
  async exchangeCodeForToken(code: string): Promise<OAuth2TokenResponse> {
    try {
      const params = new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ error, status: response.status }, 'OAuth2 token exchange failed');
        throw new Error(`OAuth2 token exchange failed: ${response.statusText}`);
      }

      const data = await response.json() as OAuth2TokenResponse;
      return data;
    } catch (error) {
      logger.error({ error }, 'OAuth2 token exchange error');
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token
   * @returns New token response
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuth2TokenResponse> {
    try {
      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      });

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`OAuth2 token refresh failed: ${response.statusText}`);
      }

      return await response.json() as OAuth2TokenResponse;
    } catch (error) {
      logger.error({ error }, 'OAuth2 token refresh error');
      throw error;
    }
  }
}

