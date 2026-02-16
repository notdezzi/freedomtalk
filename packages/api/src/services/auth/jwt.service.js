import jwt from 'jsonwebtoken';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { AuthenticationError, ApiErrorCode } from '../../types/api.types';
import { generateSnowflakeId } from '../../utils/snowflake';
class JWTService {
    privateKey;
    publicKey;
    constructor() {
        this.privateKey = process.env.JWT_PRIVATE_KEY || '';
        this.publicKey = process.env.JWT_PUBLIC_KEY || '';
        if (!this.privateKey || !this.publicKey) {
            const error = 'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set in environment variables. Generate keys using: node -e "const crypto = require(\'crypto\'); const { publicKey, privateKey } = crypto.generateKeyPairSync(\'rsa\', { modulusLength: 2048, publicKeyEncoding: { type: \'spki\', format: \'pem\' }, privateKeyEncoding: { type: \'pkcs8\', format: \'pem\' } }); console.log(\'Private Key:\\n\', privateKey); console.log(\'\\nPublic Key:\\n\', publicKey);"';
            logger.error(error);
            throw new Error(error);
        }
        this.privateKey = this.privateKey.replace(/\\n/g, '\n');
        this.publicKey = this.publicKey.replace(/\\n/g, '\n');
        logger.info('JWT service initialized with RS256 algorithm');
    }
    generateAccessToken(userId, additionalPayload) {
        const payload = {
            userId,
            type: 'access',
            jti: generateSnowflakeId(),
            ...additionalPayload,
        };
        return jwt.sign(payload, this.privateKey, {
            algorithm: 'RS256',
            expiresIn: (process.env.JWT_EXPIRES_IN || '15m'),
        });
    }
    generateRefreshToken(userId, sessionId) {
        const payload = {
            userId,
            sessionId,
            type: 'refresh',
            jti: generateSnowflakeId(),
        };
        return jwt.sign(payload, this.privateKey, {
            algorithm: 'RS256',
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
        });
    }
    async verifyToken(token) {
        try {
            const isBlacklisted = await this.isBlacklisted(token);
            if (isBlacklisted) {
                throw new AuthenticationError('Token has been revoked', ApiErrorCode.TOKEN_REVOKED);
            }
            const decoded = jwt.verify(token, this.publicKey, {
                algorithms: ['RS256'],
                clockTolerance: 30,
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AuthenticationError('Token has expired', ApiErrorCode.TOKEN_EXPIRED);
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new AuthenticationError('Invalid token', ApiErrorCode.TOKEN_INVALID);
            }
            throw error;
        }
    }
    decodeToken(token) {
        try {
            return jwt.decode(token);
        }
        catch {
            return null;
        }
    }
    async blacklistToken(token) {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) {
            logger.warn('Cannot blacklist token: invalid or missing expiration');
            return;
        }
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;
        if (ttl > 0) {
            const redis = await getRedisClient();
            await redis.setEx(`blacklist:${token}`, ttl, '1');
            logger.info({ userId: decoded.userId }, 'Token blacklisted');
        }
    }
    async isBlacklisted(token) {
        const redis = await getRedisClient();
        const result = await redis.get(`blacklist:${token}`);
        return result !== null;
    }
}
export const jwtService = new JWTService();
//# sourceMappingURL=jwt.service.js.map