/**
 * Users API Routes
 * GET /api/v1/users/me
 * PATCH /api/v1/users/me
 * GET /api/v1/users/:userId
 * PATCH /api/v1/users/me/status
 * FreedomTalk Backend - Discord Clone
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, updateUserStatus, updateUserAvatar, deleteUser } from '@/users/services';
import { requireAuth } from '@/middleware/auth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireAuth(req, () => {}) as { user: TokenPayload };

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar_url: user.avatar_url,
          status: user.status,
          custom_status: user.custom_status,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        },
      }
    );
  } catch (error: any) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireAuth(req, () => {}) as { user: TokenPayload };
    const body = await req.json();

    // Validate data
    if (!body.username && !body.avatar_url && !body.custom_status) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALD_INPUT', message: 'At least one field to update required' } },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await updateUser(user.id, {
      username: body.username,
      avatar_url: body.avatar_url,
      custom_status: body.custom_status,
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedUser,
      }
    );
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireAuth(req, () => {}) as { user: TokenPayload };
    const body = await req.json();

    if (!body.status || !['online', 'idle', 'dnd', 'offline'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALD_INPUT', message: 'Invalid status value' } },
        { status: 400 }
      );
    }

    // Update user status
    const updatedUser = await updateUserStatus(user.id, body.status, body.custom_status);

    return NextResponse.json(
      {
        success: true,
        data: updatedUser,
      }
    );
  } catch (error: any) {
    console.error('Update user status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update status' },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = req.params;
    const { user } = await requireAuth(req, () => {}) as { user: TokenPayload };

    const targetUser = await getUserById(userId);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Check if user is friend or in same server
    // TODO: Add friend check and server membership check

    return NextResponse.json(
      {
        success: true,
        data: {
          id: targetUser.id,
          username: targetUser.username,
          avatar_url: targetUser.avatar_url,
          status: targetUser.status,
        },
      }
    );
  } catch (error: any) {
    console.error('Get user by ID error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireAuth(req, () => {}) as { user: TokenPayload };
    const { userId } = req.params;
    const body = await req.json();

    if (user.id !== userId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Can only update your own account' } },
        { status: 403 }
      );
    }

    const updatedUser = await updateUser(user.id, {
      username: body.username,
      avatar_url: body.avatar_url,
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedUser,
      }
    );
  } catch (error: any) {
    console.error('Update another user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' },
      },
      { status: 500 }
    );
  }
}
