# FreedomTalk API Usage Guide

## Overview

The FreedomTalk API is a RESTful API built with Fastify that provides authentication, user management, and real-time communication features.

**Base URL:** `http://localhost:3000/api/v1`

**API Documentation:** `http://localhost:3000/docs` (Swagger UI)

## Authentication

All protected endpoints require a JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Register a New User

**Endpoint:** `POST /api/v1/auth/register`

**Rate Limit:** 5 requests per 15 minutes

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "1234567890",
    "username": "johndoe",
    "email": "john@example.com",
    "message": "Registration successful. Please verify your email."
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Login

**Endpoint:** `POST /api/v1/auth/login`

**Rate Limit:** 5 requests per 15 minutes

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "1234567890",
      "username": "johndoe",
      "email": "john@example.com",
      "emailVerified": false
    }
  }
}
```

### Refresh Access Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Rate Limit:** 10 requests per minute

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note:** The old refresh token is automatically blacklisted (token rotation security).

### Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Rate Limit:** 10 requests per minute

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

## OAuth2 Authentication

### Google OAuth2

**Step 1:** Redirect user to authorization URL

**Endpoint:** `GET /api/v1/auth/google/authorize`

This will redirect the user to Google's OAuth2 consent screen.

**Step 2:** Handle callback

**Endpoint:** `GET /api/v1/auth/google/callback?code=<code>&state=<state>`

Returns the same response as the login endpoint with access and refresh tokens.

### GitHub OAuth2

**Step 1:** Redirect user to authorization URL

**Endpoint:** `GET /api/v1/auth/github/authorize`

**Step 2:** Handle callback

**Endpoint:** `GET /api/v1/auth/github/callback?code=<code>&state=<state>`

## User Profile Management

### Get Current User Profile

**Endpoint:** `GET /api/v1/users/@me`

**Rate Limit:** 30 requests per minute

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "username": "johndoe",
    "email": "john@example.com",
    "emailVerified": false,
    "mfaEnabled": false,
    "accountStatus": "active",
    "profile": {
      "displayName": "John Doe",
      "bio": "Software developer",
      "pronouns": "he/him",
      "avatarUrl": "https://example.com/avatar.jpg",
      "bannerUrl": null,
      "customStatus": "Working on FreedomTalk"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Update Current User Profile

**Endpoint:** `PUT /api/v1/users/@me`

**Rate Limit:** 10 requests per minute

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "display_name": "John Doe",
  "bio": "Full-stack developer passionate about open source",
  "pronouns": "he/him",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "custom_status": "Building something awesome"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "displayName": "John Doe",
      "bio": "Full-stack developer passionate about open source",
      "pronouns": "he/him",
      "avatarUrl": "https://example.com/new-avatar.jpg",
      "bannerUrl": null,
      "customStatus": "Building something awesome"
    },
    "message": "Profile updated successfully"
  }
}
```

## Error Responses

All errors follow a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid authentication token
- `VALIDATION_ERROR` (400): Request validation failed
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource already exists (e.g., email/username taken)
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `OAUTH2_ERROR` (500): OAuth2 authentication failed
- `OAUTH2_REDIRECT_INVALID` (400): Invalid OAuth2 redirect URI

## Rate Limiting

Rate limits are enforced per IP address and stored in Redis:

- **Authentication endpoints** (register, login): 5 requests per 15 minutes
- **Token refresh**: 10 requests per minute
- **Profile read**: 30 requests per minute
- **Profile update**: 10 requests per minute
- **Global default**: 100 requests per minute

When rate limited, you'll receive a 429 status code with retry information in headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Security Features

### Token Rotation
Refresh tokens are single-use. When you refresh your access token, the old refresh token is blacklisted and a new one is issued.

### OAuth2 Redirect URI Validation
All OAuth2 callbacks validate the redirect URI to prevent open redirect attacks.

### Atomic Transactions
User registration and profile updates use database transactions to ensure data consistency.

### Session Management
Sessions are encrypted using AES-256-GCM and stored in Redis with automatic expiration.

## Development Tips

1. **Use Swagger UI** at `/docs` for interactive API testing
2. **Check rate limit headers** to avoid hitting limits
3. **Store refresh tokens securely** (httpOnly cookies recommended)
4. **Implement token refresh logic** before access tokens expire (15 minutes)
5. **Handle 401 errors** by refreshing tokens or redirecting to login
```

