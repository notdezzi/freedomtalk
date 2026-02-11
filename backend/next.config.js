/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,

  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    
    // Mediasoup (Voice/Video)
    LIVEKIT_URL: process.env.LIVEKIT_URL || 'ws://localhost:7880',
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || 'devkey',
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || 'devsecret',
    
    // S3 Object Storage (Hetzner)
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION || 'default',
    
    // NextAuth
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    
    // OAuth Providers
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    
    // Rate Limits
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    
    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
};

export default config;
