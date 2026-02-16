import { beforeAll, afterAll } from 'vitest';
import { testConnection, closePool } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { generateKeyPairSync, randomBytes } from 'crypto';
if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;
}
if (!process.env.SESSION_ENCRYPTION_KEY) {
    process.env.SESSION_ENCRYPTION_KEY = randomBytes(32).toString('hex');
}
beforeAll(async () => {
    try {
        await testConnection();
        await connectRedis();
    }
    catch (error) {
        console.error('Failed to connect to infrastructure:', error);
        throw error;
    }
});
afterAll(async () => {
    try {
        await disconnectRedis();
        await closePool();
    }
    catch (error) {
        console.error('Failed to disconnect from infrastructure:', error);
    }
});
//# sourceMappingURL=test-setup.js.map