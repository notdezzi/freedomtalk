import { OAuth2BaseService } from './oauth2.service';
import { logger } from '../../config/logger';
class GoogleOAuth2Service extends OAuth2BaseService {
    clientId;
    clientSecret;
    redirectUri;
    authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    tokenUrl = 'https://oauth2.googleapis.com/token';
    scope = 'openid email profile';
    userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
    constructor() {
        super();
        this.clientId = process.env.GOOGLE_CLIENT_ID || '';
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
        this.redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
        if (!this.clientId || !this.clientSecret || !this.redirectUri) {
            logger.warn('Google OAuth2 credentials not configured');
        }
        else {
            logger.info('Google OAuth2 service initialized');
        }
    }
    async getUserProfile(accessToken) {
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
            const userInfo = await response.json();
            if (!userInfo.email) {
                logger.error({ userInfo }, 'Google returned no email');
                throw new Error('Google account has no email address. Please ensure the email scope is granted.');
            }
            const profile = {
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
                avatar: userInfo.picture,
                emailVerified: userInfo.verified_email || false,
            };
            logger.info({ email: profile.email, emailVerified: profile.emailVerified }, 'Google user profile retrieved');
            return profile;
        }
        catch (error) {
            logger.error({ error }, 'Error fetching Google user profile');
            throw error;
        }
    }
    async authenticate(code, state) {
        const isValidState = await this.validateState(state);
        if (!isValidState) {
            throw new Error('Invalid or expired state parameter');
        }
        const tokenResponse = await this.exchangeCodeForToken(code);
        const profile = await this.getUserProfile(tokenResponse.access_token);
        return profile;
    }
}
export const googleOAuth2Service = new GoogleOAuth2Service();
//# sourceMappingURL=google-oauth.service.js.map