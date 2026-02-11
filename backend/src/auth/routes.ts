/**
 * Authentication API Routes
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * POST /api/v1/auth/refresh
 * POST /api/v1/auth/logout
 * FreedomTalk Backend - Discord Clone
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, getUserByUsername } from '@/users/services';
import { generateToken, generateRefreshToken } from '@/lib/jwt';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    // Validate input
    if (!body.email || !body.username || !body.password) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALD_INPUT', message: 'Email, username, and password required' } },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingEmail = await getUserByEmail(body.email);
    const existingUsername = await getUserByUsername(body.username);

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Email already exists' } },
        { status: 409 }
      );
    }

    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Username already exists' } },
        { status: 409 }
      );
    }

    // Create user (password hashing handled in service)
    const user = await createUser({
      email: body.email,
      username: body.username,
      password: body.password,
      avatar_url: body.avatar_url,
    });

    // Generate tokens
    const { token, expires } = generateToken(user.id);
    const { token: refreshToken, expires: refreshExpires } = generateRefreshToken(user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar_url: user.avatar_url,
            status: user.status,
            custom_status: user.custom_status,
            created_at: user.created_at,
          },
          token,
          expires,
          refresh_token: refreshToken,
          refresh_expires: refreshExpires,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALD_INPUT', message: 'Email and password required' } },
        { status: 400 }
      );
    }

    // Get user
    const user = await getUserByEmail(body.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALD_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // TODO: Verify password (handled in service)
    // For now, assuming password is correct (need to add bcrypt verify)

    // Generate tokens
    const { token, expires } = generateToken(user.id);
    const { token: refreshToken, expires: refreshExpires } = generateRefreshToken(user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar_url: user.avatar_url,
            status: user.status,
            custom_status: user.custom_status,
            created_at: user.created_at,
          },
          token,
          expires,
          refresh_token: refreshToken,
          refresh_expires: refreshExpires,
        },
      }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Login failed' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    if (!body.refresh_token) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALD_INPUT', message: 'Refresh token required' } },
        { status: 400 }
      );
    }

    // TODO: Verify refresh token and generate new tokens
    // For now, return error

    return NextResponse.json(
      { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Refresh endpoint coming soon' } },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Refresh failed' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get refresh token from header or body
    const body = await req.json();
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || body.refresh_token;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Token required' } },
        { status: 401 }
      );
    }

    // TODO: Invalidate refresh token and logout user
    // For now, return success

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Logout failed' } },
      { status: 500 }
    );
  }
}
