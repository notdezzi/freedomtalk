# FreedomTalk Authentication System

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Flows](#authentication-flows)
3. [API Endpoints](#api-endpoints)
4. [Security Considerations](#security-considerations)
5. [Configuration](#configuration)
6. [OAuth2 Setup](#oauth2-setup)
7. [MFA Setup](#mfa-setup)
8. [JWT Key Rotation](#jwt-key-rotation)
9. [Troubleshooting](#troubleshooting)
10. [Code Examples](#code-examples)

---

## Architecture Overview

The FreedomTalk authentication system provides:

- **Password-based authentication** with bcrypt hashing (12 salt rounds)
- **JWT tokens** using RS256 algorithm (asymmetric cryptography)
- **OAuth2 social login** (Google and GitHub)
- **Multi-Factor Authentication (MFA)** with TOTP and backup codes
- **Session management** with Redis and AES-256-GCM encryption
- **Email verification** and password reset flows
- **CSRF protection** using double-submit cookie pattern
- **Secure cookie handling** with encryption

### Technology Stack

- **Password Hashing**: bcrypt (^5.1.1)
- **JWT**: jsonwebtoken (^9.0.2) with RS256
- **MFA**: speakeasy (^2.0.0) for TOTP
- **QR Codes**: qrcode (^1.5.0)
- **Session Store**: Redis 7+ with encryption
- **Database**: PostgreSQL 16+

---

## Authentication Flows

### 1. Standard Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant DB
    participant Redis

    User->>Client: Enter credentials
    Client->>API: POST /api/v1/auth/login
    API->>DB: Verify credentials
    DB-->>API: User data
    API->>API: Verify password (bcrypt)
    
    alt MFA Enabled
        API->>Redis: Create session (mfa_verified=false)
        API-->>Client: 200 {mfa_required: true, sessionId}
        Client->>User: Prompt for MFA code
        User->>Client: Enter TOTP/backup code
        Client->>API: POST /api/v1/auth/mfa/verify
        API->>API: Verify TOTP
        API->>Redis: Update session (mfa_verified=true)
        API->>API: Generate JWT tokens
        API-->>Client: 200 {accessToken, refreshToken}
    else MFA Disabled
        API->>Redis: Create session
        API->>API: Generate JWT tokens
        API-->>Client: 200 {accessToken, refreshToken}
    end
    
    Client->>Client: Store tokens
    Client-->>User: Login successful
```

### 2. OAuth2 Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant OAuth2Provider
    participant DB
    participant Redis

    User->>Client: Click "Login with Google/GitHub"
    Client->>API: GET /api/v1/auth/google/authorize
    API->>API: Generate state parameter
    API->>Redis: Store state (10min TTL)
    API-->>Client: Redirect URL
    Client->>OAuth2Provider: Redirect to authorization URL
    OAuth2Provider->>User: Prompt for consent
    User->>OAuth2Provider: Grant permission
    OAuth2Provider->>Client: Redirect with code & state
    Client->>API: GET /api/v1/auth/google/callback?code=...&state=...
    API->>Redis: Validate state (single-use)
    API->>OAuth2Provider: Exchange code for token
    OAuth2Provider-->>API: Access token
    API->>OAuth2Provider: Get user profile
    OAuth2Provider-->>API: User data
    API->>DB: Find or create user
    API->>Redis: Create session
    API->>API: Generate JWT tokens
    API-->>Client: 200 {accessToken, refreshToken}
    Client-->>User: Login successful
```

### 3. Password Reset Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant DB
    participant Email

    User->>Client: Click "Forgot Password"
    Client->>API: POST /api/v1/auth/password-reset/request
    API->>DB: Find user by email
    API->>API: Generate reset token
    API->>DB: Store token (1 hour expiry)
    API->>Email: Send reset link
    API-->>Client: 200 (always success)
    Email->>User: Reset email
    User->>Client: Click reset link
    Client->>API: POST /api/v1/auth/password-reset/reset
    API->>DB: Validate token
    API->>API: Validate password strength
    API->>API: Hash new password
    API->>DB: Update password & mark token used
    API-->>Client: 200 Success
    Client-->>User: Password reset successful
```

---

## API Endpoints

### Authentication

#### POST /api/v1/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "StrongPass123!"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "1234567890",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": false
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

#### POST /api/v1/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

**Response (200) - No MFA:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1234567890",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Response (200) - MFA Required:**
```json
{
  "mfaRequired": true,
  "sessionId": "9876543210",
  "message": "MFA verification required"
}
```

#### POST /api/v1/auth/mfa/verify
Verify MFA code after login.

**Request:**
```json
{
  "sessionId": "9876543210",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1234567890",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

---

## Security Considerations

### Password Policies

- **Minimum length**: 8 characters
- **Required characters**:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Hashing**: bcrypt with 12 salt rounds (configurable, minimum 10)
- **Rehashing**: Automatic detection and rehashing when salt rounds increase

### Token Expiry

- **Access tokens**: 15 minutes (configurable via `JWT_EXPIRES_IN`)
- **Refresh tokens**: 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Password reset tokens**: 1 hour
- **Email verification tokens**: 24 hours
- **OAuth2 state parameters**: 10 minutes

### Session Management

- **Idle timeout**: 30 minutes (no activity)
- **Absolute timeout**: 7 days (maximum session lifetime)
- **Encryption**: AES-256-GCM for session data
- **Storage**: Redis with automatic TTL expiration
- **Session fixation prevention**: Session ID regenerated after login and MFA verification

### CSRF Protection

- **Pattern**: Double-submit cookie
- **Token generation**: 32-byte random hex string
- **Validation**: Timing-safe comparison
- **Protected methods**: POST, PUT, PATCH, DELETE
- **Cookie flags**: httpOnly=false (JS needs to read), secure=true (production), sameSite=strict

### Security Logging

All security-sensitive operations are logged with Pino:

- **Password reset requests** (user_id, ip_address, timestamp)
- **Successful password resets** (user_id, timestamp)
- **Failed password reset attempts** (ip_address, reason)
- **Email verification sent** (user_id, timestamp)
- **Successful email verification** (user_id, timestamp)
- **Failed verification attempts** (ip_address, reason)
- **MFA setup/enable/disable** (user_id, timestamp)
- **Failed login attempts** (email, ip_address, reason)
- **Token blacklisting** (user_id, reason)

### Rate Limiting

- **Password reset**: 3 requests per hour per email
- **Email verification**: 3 sends per hour per user
- **Login attempts**: (To be implemented in future milestone)

---

## Configuration

### Environment Variables

#### JWT Configuration

```bash
# RS256 Private Key (PEM format, newlines escaped as \n)
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----

# RS256 Public Key (PEM format, newlines escaped as \n)
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvL...\n-----END PUBLIC KEY-----

# Token expiry times
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### Password Hashing

```bash
# Bcrypt salt rounds (minimum 10, recommended 12)
BCRYPT_SALT_ROUNDS=12
```

#### Session & Cookie Encryption

```bash
# 32-byte hex string for session encryption
SESSION_ENCRYPTION_KEY=your-32-byte-hex-session-encryption-key-change-this

# 32-byte hex string for cookie encryption
COOKIE_ENCRYPTION_KEY=your-32-byte-hex-cookie-encryption-key-change-this
```

#### OAuth2 - Google

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback
```

#### OAuth2 - GitHub

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3001/api/v1/auth/github/callback
```

#### Email Service

```bash
EMAIL_FROM=noreply@freedomtalk.dev
EMAIL_SERVICE=console  # 'console' for development, 'smtp' for production

# SMTP Configuration (for production)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

#### Other

```bash
# Frontend URL for email links
WEB_URL=http://localhost:3000

# Cookie domain (optional)
COOKIE_DOMAIN=.freedomtalk.dev
```

### Generating Keys

#### JWT RSA Key Pair

```bash
node -e "const crypto = require('crypto'); const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } }); console.log('Private Key:\n', privateKey); console.log('\nPublic Key:\n', publicKey);"
```

#### Encryption Keys

```bash
# Session encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Cookie encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## OAuth2 Setup

### Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/v1/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

### GitHub OAuth2

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in application details:
   - Application name: FreedomTalk
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3001/api/v1/auth/github/callback`
4. Click "Register application"
5. Copy Client ID and generate Client Secret
6. Copy credentials to `.env`

---

## MFA Setup

### For Users

1. **Enable MFA**:
   - Navigate to account settings
   - Click "Enable Two-Factor Authentication"
   - Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Enter TOTP code to verify setup
   - **Save backup codes** in a secure location

2. **Login with MFA**:
   - Enter email and password
   - When prompted, enter 6-digit code from authenticator app
   - Or use one of your backup codes

3. **Disable MFA**:
   - Navigate to account settings
   - Click "Disable Two-Factor Authentication"
   - Enter current password to confirm

4. **Regenerate Backup Codes**:
   - Navigate to account settings
   - Click "Regenerate Backup Codes"
   - **Save new codes** (old codes will be invalidated)

---

## JWT Key Rotation

### Why Rotate Keys?

- **Security best practice**: Regular rotation limits exposure if keys are compromised
- **Compliance**: Some regulations require periodic key rotation
- **Recommended schedule**: Every 90 days

### Manual Key Rotation Strategy

#### Step 1: Generate New Key Pair

```bash
node -e "const crypto = require('crypto'); const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } }); console.log('NEW_JWT_PRIVATE_KEY=' + privateKey.replace(/\n/g, '\\n')); console.log('NEW_JWT_PUBLIC_KEY=' + publicKey.replace(/\n/g, '\\n'));"
```

#### Step 2: Grace Period Approach

To avoid invalidating existing tokens, use a grace period:

1. **Add new keys** to environment as `JWT_PRIVATE_KEY_NEW` and `JWT_PUBLIC_KEY_NEW`
2. **Update JWT service** to sign with new key but verify with both old and new keys
3. **Wait for grace period** (e.g., 7 days - longer than refresh token expiry)
4. **Remove old keys** and rename new keys to `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`

#### Step 3: Implementation Example

```typescript
// Modified verifyToken to support multiple keys
async verifyToken(token: string): Promise<JWTPayload> {
  // Try new key first
  try {
    return jwt.verify(token, this.publicKeyNew, { algorithms: ['RS256'] });
  } catch {
    // Fall back to old key during grace period
    return jwt.verify(token, this.publicKey, { algorithms: ['RS256'] });
  }
}
```

### Security Implications of Key Compromise

If JWT private key is compromised:

1. **Immediate action**: Generate new key pair immediately
2. **Blacklist all tokens**: Add all active tokens to blacklist
3. **Force re-authentication**: Require all users to log in again
4. **Investigate**: Determine how key was compromised
5. **Notify users**: If user data may be affected

---

## Troubleshooting

### Common Errors

#### "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set"

**Cause**: Missing JWT keys in environment variables

**Solution**:
```bash
# Generate keys
node -e "const crypto = require('crypto'); const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } }); console.log('JWT_PRIVATE_KEY=' + privateKey.replace(/\n/g, '\\n')); console.log('JWT_PUBLIC_KEY=' + publicKey.replace(/\n/g, '\\n'));"

# Add to .env file
```

#### "SESSION_ENCRYPTION_KEY must be a 32-byte hex string"

**Cause**: Missing or invalid session encryption key

**Solution**:
```bash
# Generate key
node -e "console.log('SESSION_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file
```

#### "Token has been revoked"

**Cause**: Token was blacklisted (user logged out or token was manually revoked)

**Solution**: User needs to log in again to get new tokens

#### "MFA verification required"

**Cause**: User has MFA enabled but hasn't verified TOTP code yet

**Solution**: Prompt user for TOTP code and call `/api/v1/auth/mfa/verify`

#### "No verified email found on your GitHub account"

**Cause**: GitHub account has no verified email addresses

**Solution**: User needs to verify at least one email on GitHub (https://github.com/settings/emails)

### Debugging

#### Enable Debug Logging

```bash
# Set log level to debug
LOG_LEVEL=debug npm run dev
```

#### Check Redis Connection

```bash
# Connect to Redis CLI
docker exec -it freedomtalk-redis redis-cli

# Check session keys
KEYS session:*

# Check blacklisted tokens
KEYS blacklist:*

# Check OAuth2 state
KEYS oauth_state:*
```

#### Check Database

```bash
# Connect to PostgreSQL
docker exec -it freedomtalk-postgres psql -U freedomtalk -d freedomtalk

# Check users
SELECT id, email, email_verified, mfa_enabled FROM users;

# Check password resets
SELECT * FROM password_resets WHERE expires_at > NOW();
```

---

## Code Examples

### Basic Login

```typescript
// Client-side code
async function login(email: string, password: string) {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.mfaRequired) {
    // Prompt for MFA code
    const code = prompt('Enter MFA code:');
    return verifyMFA(data.sessionId, code);
  }

  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data.user;
}

async function verifyMFA(sessionId: string, code: string) {
  const response = await fetch('/api/v1/auth/mfa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, code }),
  });

  const data = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data.user;
}
```

### OAuth2 Login

```typescript
// Client-side code
async function loginWithGoogle() {
  // Get authorization URL
  const response = await fetch('/api/v1/auth/google/authorize');
  const { authorizationUrl } = await response.json();

  // Redirect to Google
  window.location.href = authorizationUrl;
}

// Callback handler (after redirect from Google)
async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  const response = await fetch(`/api/v1/auth/google/callback?code=${code}&state=${state}`);
  const data = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data.user;
}
```

### Protected API Request

```typescript
// Client-side code
async function makeAuthenticatedRequest(url: string) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    // Token expired, try to refresh
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry request with new token
      return makeAuthenticatedRequest(url);
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
    }
  }

  return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');

  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const { accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    return true;
  } catch {
    return false;
  }
}
```

---

## Best Practices

1. **Never store sensitive data in JWT payload** - JWTs are base64 encoded, not encrypted
2. **Always use HTTPS in production** - Tokens can be intercepted over HTTP
3. **Implement token refresh** - Don't force users to re-login every 15 minutes
4. **Use secure cookie flags** - httpOnly, secure, sameSite
5. **Rotate JWT keys regularly** - Every 90 days recommended
6. **Log security events** - Monitor for suspicious activity
7. **Rate limit authentication endpoints** - Prevent brute force attacks
8. **Validate all user input** - Prevent injection attacks
9. **Use strong password policies** - Enforce complexity requirements
10. **Enable MFA for sensitive accounts** - Additional security layer

---

**Last Updated**: 2026-02-16
**Version**: 1.0.0
