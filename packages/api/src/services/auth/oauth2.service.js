import crypto from 'crypto';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
export class OAuth2BaseService {
    generateState() {
        return crypto.randomBytes(32).toString('hex');
    }
    async saveState(state) {
        await (await getRedisClient()).setEx(`oauth_state:${state}`, 600, '1');
    }
    async validateState(state) {
        const exists = await (await getRedisClient()).get(`oauth_state:${state}`);
        if (exists) {
            await (await getRedisClient()).del(`oauth_state:${state}`);
            return true;
        }
        return false;
    }
    async getAuthorizationUrl(state) {
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
    async exchangeCodeForToken(code) {
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
            const data = await response.json();
            return data;
        }
        catch (error) {
            logger.error({ error }, 'OAuth2 token exchange error');
            throw error;
        }
    }
    async refreshAccessToken(refreshToken) {
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
            return await response.json();
        }
        catch (error) {
            logger.error({ error }, 'OAuth2 token refresh error');
            throw error;
        }
    }
}
//# sourceMappingURL=oauth2.service.js.map