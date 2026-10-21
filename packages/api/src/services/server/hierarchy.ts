/**
 * Role hierarchy helpers
 *
 * Discord-style hierarchy rules shared by role management, member role
 * assignment, kick, and ban flows:
 * - The server owner bypasses all hierarchy checks.
 * - An actor can only act on roles/members strictly below their own
 *   highest role position.
 * - ADMINISTRATOR can only be granted/removed by an actor who has it.
 */

import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';

export function hexToBigint(value: string | null | undefined): bigint {
  if (!value) return 0n;
  return BigInt(value);
}

export async function isServerOwner(serverId: string, userId: string): Promise<boolean> {
  const server = await db('servers')
    .where('id', serverId)
    .where('owner_id', userId)
    .first();
  return !!server;
}

/**
 * Highest role position of a member (-1 when they hold no assignable roles).
 */
export async function getHighestRolePosition(serverId: string, userId: string): Promise<number> {
  const result = await db('member_roles')
    .join('roles', 'member_roles.role_id', 'roles.id')
    .where('member_roles.server_id', serverId)
    .where('member_roles.user_id', userId)
    .max('roles.position as max_position')
    .first();

  return result?.max_position !== undefined && result?.max_position !== null
    ? Number(result.max_position)
    : -1;
}

export async function actorHasAdministrator(serverId: string, userId: string): Promise<boolean> {
  if (await isServerOwner(serverId, userId)) {
    return true;
  }
  const roles = await db('member_roles')
    .join('roles', 'member_roles.role_id', 'roles.id')
    .where('member_roles.server_id', serverId)
    .where('member_roles.user_id', userId)
    .select('roles.allow_permissions');

  return roles.some(
    (r) => (hexToBigint(r.allow_permissions) & PERMISSION_FLAGS.ADMINISTRATOR) !== 0n
  );
}

/**
 * Assert the actor may target the given member for moderation
 * (role changes, kick, ban). The owner can never be targeted by anyone
 * but themselves (and owners cannot be kicked/banned at all), and the
 * actor must outrank the target.
 */
export async function assertCanModerateMember(
  serverId: string,
  actorId: string,
  targetUserId: string
): Promise<void> {
  if (actorId === targetUserId) {
    return; // Self-actions (leave, self-role edits) are handled elsewhere
  }

  if (await isServerOwner(serverId, targetUserId)) {
    throw new AppError(403, 'FORBIDDEN', 'The server owner cannot be targeted by this action');
  }

  if (await isServerOwner(serverId, actorId)) {
    return;
  }

  const actorPosition = await getHighestRolePosition(serverId, actorId);
  const targetPosition = await getHighestRolePosition(serverId, targetUserId);

  if (actorPosition <= targetPosition) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You cannot perform this action on a member with equal or higher role position'
    );
  }
}

/**
 * Assert the actor may assign/modify the given set of roles: every role must
 * belong to the server, sit strictly below the actor's highest role, and any
 * ADMINISTRATOR-carrying role requires the actor to have ADMINISTRATOR.
 */
export async function assertCanAssignRoles(
  serverId: string,
  actorId: string,
  roleIds: string[]
): Promise<void> {
  if (roleIds.length === 0) {
    return;
  }

  const roles = await db('roles')
    .whereIn('id', roleIds)
    .where('server_id', serverId)
    .select('id', 'name', 'position', 'allow_permissions');

  if (roles.length !== new Set(roleIds).size) {
    throw new AppError(400, 'INVALID_ROLES', 'One or more roles do not belong to this server');
  }

  const isOwner = await isServerOwner(serverId, actorId);
  const actorPosition = isOwner ? Number.MAX_SAFE_INTEGER : await getHighestRolePosition(serverId, actorId);

  for (const role of roles) {
    if (role.name === '@everyone') {
      throw new AppError(400, 'INVALID_ROLES', 'The @everyone role cannot be assigned to members');
    }
    if (!isOwner && role.position >= actorPosition) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You cannot assign a role at or above your highest role'
      );
    }
    if ((hexToBigint(role.allow_permissions) & PERMISSION_FLAGS.ADMINISTRATOR) !== 0n) {
      const hasAdmin = isOwner || (await actorHasAdministrator(serverId, actorId));
      if (!hasAdmin) {
        throw new AppError(403, 'FORBIDDEN', 'You cannot assign a role with ADMINISTRATOR');
      }
    }
  }
}
