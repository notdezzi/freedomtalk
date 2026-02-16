/**
 * Google OAuth2 Provider
 * 
 * Implements Google OAuth2 authentication flow.
 * Supports user profile retrieval and account linking.
 */

import { OAuth2BaseService, OAuth2UserProfile } from './oauth2.service';
import { logger } from '../../config/logger';

/**
 * Google user info response
 */
interface GoogleUserInfo {
  id: string;
  email?: string;
  verified_email?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Google OAuth2 service
 */
class GoogleOAuth2Service extends OAuth2BaseService {
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;
  protected authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  protected tokenUrl = 'https://oauth2.googleapis.com/token';
  protected scope = 'openid email profile';
  private userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

  constructor() {
    super();
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      logger.warn('Google OAuth2 credentials not configured');
    } else {
      logger.info('Google OAuth2 service initialized');
    }
  }

  /**
   * Get user profile from Google
   * @param accessToken - Google access token
   * @returns User profile
   */
  protected async getUserProfile(accessToken: string): Promise<OAuth2UserProfile> {
    try {
      const response = await fetch(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ error, status: response.status }, 'Failed to fetch Google user info');
        throw new Error(`Failed to fetch Google user info: ${response.statusText}`);
      }

      const userInfo = await response.json() as GoogleUserInfo;

      // ERROR HANDLING: Google must return an email
      if (!userInfo.email) {
        logger.error({ userInfo }, 'Google returned no email');
        throw new Error('Google account has no email address. Please ensure the email scope is granted.');
      }

      // Map Google user info to our OAuth2UserProfile
      const profile: OAuth2UserProfile = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
        avatar: userInfo.picture,
        // ERROR HANDLING: If email is not verified on Google, mark as unverified
        emailVerified: userInfo.verified_email || false,
      };

      logger.info({ email: profile.email, emailVerified: profile.emailVerified }, 'Google user profile retrieved');
      return profile;
    } catch (error) {
      logger.error({ error }, 'Error fetching Google user profile');
      throw error;
    }
  }

  /**
   * Complete OAuth2 flow and get user profile
   * @param code - Authorization code
   * @param state - State parameter for CSRF validation
   * @returns User profile
   */
  async authenticate(code: string, state: string): Promise<OAuth2UserProfile> {
    // Validate state parameter
    const isValidState = await this.validateState(state);
    if (!isValidState) {
      throw new Error('Invalid or expired state parameter');
    }

    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(code);

    // Get user profile
    const profile = await this.getUserProfile(tokenResponse.access_token);

    return profile;
  }
}

/**
 * Google OAuth2 service singleton
 */
export const googleOAuth2Service = new GoogleOAuth2Service();

