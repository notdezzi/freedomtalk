/**
 * GitHub OAuth2 Provider
 * 
 * Implements GitHub OAuth2 authentication flow.
 * Supports user profile retrieval and account linking.
 */

import { OAuth2BaseService, OAuth2UserProfile } from './oauth2.service';
import { logger } from '../../config/logger';

/**
 * GitHub user profile response
 */
interface GitHubUserProfile {
  id: number;
  login: string;
  name?: string;
  email?: string | null;
  avatar_url?: string;
}

/**
 * GitHub email response
 */
interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility?: string | null;
}

/**
 * GitHub OAuth2 service
 */
class GitHubOAuth2Service extends OAuth2BaseService {
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;
  protected authorizationUrl = 'https://github.com/login/oauth/authorize';
  protected tokenUrl = 'https://github.com/login/oauth/access_token';
  protected scope = 'user:email';
  private userProfileUrl = 'https://api.github.com/user';
  private userEmailsUrl = 'https://api.github.com/user/emails';

  constructor() {
    super();
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.redirectUri = process.env.GITHUB_REDIRECT_URI || '';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      logger.warn('GitHub OAuth2 credentials not configured');
    } else {
      logger.info('GitHub OAuth2 service initialized');
    }
  }

  /**
   * Get user profile from GitHub
   * Requires TWO API calls: one for profile, one for emails
   * @param accessToken - GitHub access token
   * @returns User profile
   */
  protected async getUserProfile(accessToken: string): Promise<OAuth2UserProfile> {
    try {
      // Call 1: Get user profile
      const profileResponse = await fetch(this.userProfileUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'FreedomTalk',
        },
      });

      if (!profileResponse.ok) {
        const error = await profileResponse.text();
        logger.error({ error, status: profileResponse.status }, 'Failed to fetch GitHub user profile');
        throw new Error(`Failed to fetch GitHub user profile: ${profileResponse.statusText}`);
      }

      const userProfile = await profileResponse.json() as GitHubUserProfile;

      // Call 2: Get user emails (GitHub requires separate call)
      const emailsResponse = await fetch(this.userEmailsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'FreedomTalk',
        },
      });

      if (!emailsResponse.ok) {
        const error = await emailsResponse.text();
        logger.error({ error, status: emailsResponse.status }, 'Failed to fetch GitHub user emails');
        throw new Error(`Failed to fetch GitHub user emails: ${emailsResponse.statusText}`);
      }

      const emails = await emailsResponse.json() as GitHubEmail[];

      // Find primary verified email
      let email = emails.find(e => e.primary && e.verified)?.email;
      
      // Fallback to any verified email
      if (!email) {
        email = emails.find(e => e.verified)?.email;
      }

      // ERROR HANDLING: No verified email found
      if (!email) {
        logger.error({ login: userProfile.login, emails }, 'No verified email found on GitHub account');
        throw new Error(
          'No verified email found on your GitHub account. Please verify at least one email address on GitHub (https://github.com/settings/emails) and try again.'
        );
      }

      // Check if email is hidden by privacy settings
      const primaryEmail = emails.find(e => e.primary);
      if (primaryEmail && primaryEmail.visibility === 'private') {
        logger.warn({ login: userProfile.login }, 'GitHub email is set to private');
        // We still have the email from the API, so we can proceed
        // But log a warning in case this causes issues
      }

      // Map GitHub user info to our OAuth2UserProfile
      const profile: OAuth2UserProfile = {
        id: userProfile.id.toString(),
        email: email,
        name: userProfile.name || userProfile.login,
        avatar: userProfile.avatar_url,
        emailVerified: true, // We only accept verified emails
      };

      logger.info({ email: profile.email, login: userProfile.login }, 'GitHub user profile retrieved');
      return profile;
    } catch (error) {
      logger.error({ error }, 'Error fetching GitHub user profile');
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
 * GitHub OAuth2 service singleton
 */
export const githubOAuth2Service = new GitHubOAuth2Service();

