export const schemas = {
    ApiResponse: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: {
                type: 'object',
                properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                    details: { type: 'object' },
                },
            },
            meta: {
                type: 'object',
                properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    requestId: { type: 'string' },
                },
            },
        },
    },
    RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
            username: { type: 'string', minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, maxLength: 128 },
        },
    },
    LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
        },
    },
    RefreshTokenRequest: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
            refresh_token: { type: 'string' },
        },
    },
    AuthResponse: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: true },
            data: {
                type: 'object',
                properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    user: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            email: { type: 'string' },
                            emailVerified: { type: 'boolean' },
                        },
                    },
                },
            },
        },
    },
    UpdateProfileRequest: {
        type: 'object',
        properties: {
            display_name: { type: 'string', minLength: 1, maxLength: 100 },
            bio: { type: 'string', maxLength: 500 },
            pronouns: { type: 'string', maxLength: 50 },
            avatar_url: { type: 'string', format: 'uri' },
            banner_url: { type: 'string', format: 'uri' },
            custom_status: { type: 'string', maxLength: 200 },
        },
    },
    UserProfileResponse: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: true },
            data: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    emailVerified: { type: 'boolean' },
                    mfaEnabled: { type: 'boolean' },
                    accountStatus: { type: 'string' },
                    profile: {
                        type: 'object',
                        properties: {
                            displayName: { type: 'string' },
                            bio: { type: 'string' },
                            pronouns: { type: 'string' },
                            avatarUrl: { type: 'string' },
                            bannerUrl: { type: 'string' },
                            customStatus: { type: 'string' },
                        },
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
        },
    },
    ErrorResponse: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: false },
            error: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string', example: 'Validation failed' },
                    details: { type: 'object' },
                },
            },
            meta: {
                type: 'object',
                properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    requestId: { type: 'string' },
                },
            },
        },
    },
};
//# sourceMappingURL=schemas.js.map