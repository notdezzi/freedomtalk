import { OAuth2BaseService } from './oauth2.service';
import { logger } from '../../config/logger';
class GitHubOAuth2Service extends OAuth2BaseService {
    clientId;
    clientSecret;
    redirectUri;
    authorizationUrl = 'https://github.com/login/oauth/authorize';
    tokenUrl = 'https://github.com/login/oauth/access_token';
    scope = 'user:email';
    userProfileUrl = 'https://api.github.com/user';
    userEmailsUrl = 'https://api.github.com/user/emails';
    constructor() {
        super();
        this.clientId = process.env.GITHUB_CLIENT_ID || '';
        this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
        this.redirectUri = process.env.GITHUB_REDIRECT_URI || '';
        if (!this.clientId || !this.clientSecret || !this.redirectUri) {
            logger.warn('GitHub OAuth2 credentials not configured');
        }
        else {
            logger.info('GitHub OAuth2 service initialized');
        }
    }
    async getUserProfile(accessToken) {
        try {
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
            const userProfile = await profileResponse.json();
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
            const emails = await emailsResponse.json();
            let email = emails.find(e => e.primary && e.verified)?.email;
            if (!email) {
                email = emails.find(e => e.verified)?.email;
            }
            if (!email) {
                logger.error({ login: userProfile.login, emails }, 'No verified email found on GitHub account');
                throw new Error('No verified email found on your GitHub account. Please verify at least one email address on GitHub (https://github.com/settings/emails) and try again.');
            }
            const primaryEmail = emails.find(e => e.primary);
            if (primaryEmail && primaryEmail.visibility === 'private') {
                logger.warn({ login: userProfile.login }, 'GitHub email is set to private');
            }
            const profile = {
                id: userProfile.id.toString(),
                email: email,
                name: userProfile.name || userProfile.login,
                avatar: userProfile.avatar_url,
                emailVerified: true,
            };
            logger.info({ email: profile.email, login: userProfile.login }, 'GitHub user profile retrieved');
            return profile;
        }
        catch (error) {
            logger.error({ error }, 'Error fetching GitHub user profile');
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
export const githubOAuth2Service = new GitHubOAuth2Service();
//# sourceMappingURL=github-oauth.service.js.map