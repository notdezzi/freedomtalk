# Authentication System Tests

This directory contains comprehensive tests for the FreedomTalk authentication system.

## Test Coverage

### Implemented Tests

1. **Password Service Tests** (`password.service.test.ts`)
   - Password hashing with bcrypt
   - Password verification
   - Password strength validation
   - Rehash detection

2. **JWT Service Tests** (`jwt.service.test.ts`)
   - Access token generation
   - Refresh token generation
   - Token verification
   - Token blacklisting
   - Token decoding

### Tests To Be Implemented

The following test files should be created to achieve >80% coverage:

3. **Session Service Tests** (`session.service.test.ts`)
   - Session creation with encryption
   - Session retrieval and validation
   - Session update and TTL refresh
   - Session deletion
   - Multi-device logout
   - Session fixation prevention (regenerateSessionId)
   - Expired session cleanup

4. **OAuth2 Service Tests** (`oauth2.service.test.ts`)
   - State parameter generation and validation
   - Authorization URL generation
   - Token exchange
   - Token refresh
   - Google OAuth2 provider
   - GitHub OAuth2 provider

5. **Password Reset Service Tests** (`password-reset.service.test.ts`)
   - Reset token generation
   - Token validation
   - Password reset flow
   - Rate limiting
   - Expired token cleanup
   - Security logging

6. **Email Verification Service Tests** (`email-verification.service.test.ts`)
   - Verification token generation
   - Email verification flow
   - Resend verification email
   - Rate limiting
   - Expired token cleanup

7. **MFA Service Tests** (`mfa.service.test.ts`)
   - MFA setup (secret generation, QR code)
   - TOTP verification
   - Backup code generation
   - Backup code verification
   - MFA enable/disable
   - Backup code regeneration

8. **CSRF Protection Tests** (`csrf.test.ts`)
   - CSRF token generation
   - Token validation
   - Double-submit cookie pattern
   - Timing-safe comparison

9. **Secure Cookie Tests** (`cookies.test.ts`)
   - Cookie encryption/decryption
   - Secure cookie flags
   - Cookie deletion

10. **Authentication Middleware Tests** (`auth.middleware.test.ts`)
    - Token extraction from headers and cookies
    - User loading
    - MFA verification check
    - Optional authentication
    - Error handling

## Running Tests

### Prerequisites

1. Set up environment variables for testing:
```bash
# Copy .env.example to .env.test
cp .env.example .env.test

# Generate JWT keys for testing
node -e "const crypto = require('crypto'); const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } }); console.log('JWT_PRIVATE_KEY=' + privateKey.replace(/\\n/g, '\\\\n')); console.log('JWT_PUBLIC_KEY=' + publicKey.replace(/\\n/g, '\\\\n'));"

# Generate encryption keys
node -e "console.log('SESSION_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('COOKIE_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

2. Ensure PostgreSQL and Redis are running:
```bash
docker-compose up -d postgres redis
```

3. Run migrations:
```bash
npm run migrate:latest
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests with UI

```bash
npm run test:ui
```

## Coverage Target

The authentication system has a coverage target of **>80%** for:
- Lines
- Functions
- Branches
- Statements

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data (Redis keys, database records) after tests
3. **Mocking**: Mock external dependencies (email service, external APIs) when appropriate
4. **Security**: Never commit real credentials or keys to version control
5. **Assertions**: Use descriptive assertions and test both success and failure cases

## Notes

- JWT tests require valid RSA key pairs in environment variables
- Session and Redis tests require a running Redis instance
- Database tests require a running PostgreSQL instance
- Some tests may be slow due to bcrypt hashing (intentionally slow for security)

