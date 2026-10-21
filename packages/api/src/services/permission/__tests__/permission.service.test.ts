/**
 * Permission Service Integration Tests
 * Exercises the waterfall resolution algorithm and channel overwrite
 * precedence against a real Postgres (provisioned by Testcontainers).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../config/database';
import { permissionService } from '../permission.service';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';

const { SEND_MESSAGES, VIEW_CHANNEL, CONNECT, ADMINISTRATOR, KICK_MEMBERS, MANAGE_MESSAGES_TEXT } =
  PERMISSION_FLAGS;

// Fixed fixture IDs (cleaned up in afterAll)
const SERVER_ID = '9999990000000000001';
const OWNER_ID = '9999990000000000010';
const MEMBER_ID = '9999990000000000011';
const MEMBER2_ID = '9999990000000000012';
const CHANNEL_ID = '9999990000000000020';
const EVERYONE_ROLE_ID = '9999990000000000030';
const HIGH_ROLE_ID = '9999990000000000031';
const LOW_ROLE_ID = '9999990000000000032';

async function insertUser(id: string, username: string) {
  await db('users').insert({
    id,
    username,
    email: `${username}@perm-test.com`,
    password_hash: 'test-hash',
    email_verified: true,
    mfa_enabled: false,
    account_status: 'active',
  });
}

async function insertRole(id: string, name: string, position: number, allow: bigint, deny: bigint) {
  await db('roles').insert({
    id,
    server_id: SERVER_ID,
    name,
    position,
    allow_permissions: allow.toString(),
    deny_permissions: deny.toString(),
  });
}

let overwriteSeq = 0;

async function insertOverwrite(
  targetId: string,
  targetType: 'role' | 'member',
  allow: bigint,
  deny: bigint
) {
  await db('permission_overwrites').insert({
    id: `9999990000000200${String(++overwriteSeq).padStart(2, '0')}`,
    channel_id: CHANNEL_ID,
    target_id: targetId,
    target_type: targetType,
    allow: allow.toString(),
    deny: deny.toString(),
  });
}

describe('PermissionService (integration)', () => {
  beforeAll(async () => {
    await insertUser(OWNER_ID, 'perm-owner');
    await insertUser(MEMBER_ID, 'perm-member');
    await insertUser(MEMBER2_ID, 'perm-member2');

    await db('servers').insert({ id: SERVER_ID, name: 'Perm Test Server', owner_id: OWNER_ID });
    // Membership is required for permission resolution (non-members are denied)
    await db('server_members').insert([
      { id: '9999990000000000041', server_id: SERVER_ID, user_id: MEMBER_ID, joined_at: new Date() },
      { id: '9999990000000000042', server_id: SERVER_ID, user_id: MEMBER2_ID, joined_at: new Date() },
    ]);

    // @everyone: can view, send, connect
    await insertRole(
      EVERYONE_ROLE_ID,
      '@everyone',
      0,
      VIEW_CHANNEL | SEND_MESSAGES | CONNECT,
      0n
    );
    // High role: denies SEND_MESSAGES, allows KICK_MEMBERS
    await insertRole(HIGH_ROLE_ID, 'Moderator', 10, KICK_MEMBERS, SEND_MESSAGES);
    // Low role: allows SEND_MESSAGES (should NOT override the high role's deny)
    await insertRole(LOW_ROLE_ID, 'Member', 1, SEND_MESSAGES, 0n);

    // MEMBER has moderator + member roles
    await db('member_roles').insert([
      { server_id: SERVER_ID, user_id: MEMBER_ID, role_id: HIGH_ROLE_ID },
      { server_id: SERVER_ID, user_id: MEMBER_ID, role_id: LOW_ROLE_ID },
    ]);
    // MEMBER2 has only the low role
    await db('member_roles').insert({
      server_id: SERVER_ID,
      user_id: MEMBER2_ID,
      role_id: LOW_ROLE_ID,
    });

    await db('channels').insert({ id: CHANNEL_ID, server_id: SERVER_ID, name: 'general', type: 'text' });
  });

  afterAll(async () => {
    await db('permission_overwrites').where('channel_id', CHANNEL_ID).del();
    await db('member_roles').where('server_id', SERVER_ID).del();
    await db('server_members').where('server_id', SERVER_ID).del();
    await db('roles').where('server_id', SERVER_ID).del();
    await db('channels').where('id', CHANNEL_ID).del();
    await db('servers').where('id', SERVER_ID).del();
    await db('users').whereIn('id', [OWNER_ID, MEMBER_ID, MEMBER2_ID]).del();
  });

  describe('resolvePermission (server-level waterfall)', () => {
    it('allows the server owner everything', async () => {
      await expect(permissionService.resolvePermission(OWNER_ID, SERVER_ID, ADMINISTRATOR)).resolves.toBe('allow');
      await expect(permissionService.hasPermission(OWNER_ID, SERVER_ID, KICK_MEMBERS)).resolves.toBe(true);
    });

    it('allows a decision from the highest-position role', async () => {
      // High role (position 10) allows KICK_MEMBERS
      await expect(permissionService.hasPermission(MEMBER_ID, SERVER_ID, KICK_MEMBERS)).resolves.toBe(true);
    });

    it('a high-role deny wins over a low-role allow (waterfall order)', async () => {
      // High role (position 10) denies SEND_MESSAGES even though low role (position 1) allows it
      await expect(permissionService.hasPermission(MEMBER_ID, SERVER_ID, SEND_MESSAGES)).resolves.toBe(false);
    });

    it('grants everything to a role holding ADMINISTRATOR', async () => {
      const adminRole = '9999990000000000033';
      await insertRole(adminRole, 'Admin', 20, ADMINISTRATOR, 0n);
      const adminUser = '9999990000000000013';
      await insertUser(adminUser, 'perm-admin');
      await db('server_members').insert({ id: '9999990000000000043', server_id: SERVER_ID, user_id: adminUser, joined_at: new Date() });
      await db('member_roles').insert({ server_id: SERVER_ID, user_id: adminUser, role_id: adminRole });

      await expect(permissionService.hasPermission(adminUser, SERVER_ID, KICK_MEMBERS)).resolves.toBe(true);
      await expect(permissionService.hasPermission(adminUser, SERVER_ID, CONNECT)).resolves.toBe(true);

      await db('member_roles').where({ user_id: adminUser }).del();
      await db('server_members').where({ user_id: adminUser }).del();
      await db('users').where('id', adminUser).del();
      await db('roles').where('id', adminRole).del();
    });

    it('defaults to deny when no role decides', async () => {
      // MEMBER2 only has the low role; nobody decides MANAGE_MESSAGES_TEXT
      await expect(permissionService.hasPermission(MEMBER2_ID, SERVER_ID, MANAGE_MESSAGES_TEXT)).resolves.toBe(false);
    });

    it('denies non-members even for @everyone-granted permissions', async () => {
      // Membership gates every resolution: SEND_MESSAGES is granted to
      // @everyone, but a user who never joined must not inherit it.
      await expect(permissionService.hasPermission('9999990000000999999', SERVER_ID, SEND_MESSAGES)).resolves.toBe(false);
      await expect(permissionService.hasPermission('9999990000000999999', SERVER_ID, KICK_MEMBERS)).resolves.toBe(false);
    });
  });

  describe('resolveChannelPermission (overwrite precedence)', () => {
    it('applies no overwrite when none exist', async () => {
      await expect(permissionService.hasChannelPermission(MEMBER2_ID, CHANNEL_ID, SEND_MESSAGES)).resolves.toBe(true);
    });

    it('applies the @everyone overwrite', async () => {
      await insertOverwrite(SERVER_ID, 'role', 0n, SEND_MESSAGES);
      try {
        await expect(permissionService.hasChannelPermission(MEMBER2_ID, CHANNEL_ID, SEND_MESSAGES)).resolves.toBe(false);
      } finally {
        await db('permission_overwrites').where('channel_id', CHANNEL_ID).del();
      }
    });

    it('member overwrite has the highest priority', async () => {
      // Everyone overwrite denies SEND_MESSAGES, member overwrite allows it back
      await insertOverwrite(SERVER_ID, 'role', 0n, SEND_MESSAGES);
      await insertOverwrite(MEMBER2_ID, 'member', SEND_MESSAGES, 0n);
      try {
        await expect(permissionService.hasChannelPermission(MEMBER2_ID, CHANNEL_ID, SEND_MESSAGES)).resolves.toBe(true);
        // ...but only for that member
        await expect(permissionService.hasChannelPermission(OWNER_ID, CHANNEL_ID, SEND_MESSAGES)).resolves.toBe(true); // owner bypass
      } finally {
        await db('permission_overwrites').where('channel_id', CHANNEL_ID).del();
      }
    });

    it('role overwrite beats the @everyone overwrite', async () => {
      // Everyone denies SEND_MESSAGES; the low role's overwrite allows it back
      await insertOverwrite(SERVER_ID, 'role', 0n, SEND_MESSAGES);
      await insertOverwrite(LOW_ROLE_ID, 'role', SEND_MESSAGES, 0n);
      try {
        // MEMBER2 has the low role -> allowed
        await expect(permissionService.hasChannelPermission(MEMBER2_ID, CHANNEL_ID, SEND_MESSAGES)).resolves.toBe(true);
      } finally {
        await db('permission_overwrites').where('channel_id', CHANNEL_ID).del();
      }
    });

    it('higher-position role overwrites win over lower-position ones', async () => {
      await insertOverwrite(LOW_ROLE_ID, 'role', SEND_MESSAGES, 0n);
      await insertOverwrite(HIGH_ROLE_ID, 'role', 0n, SEND_MESSAGES);
      try {
        // MEMBER has both roles; moderator deny (position 10) beats member allow (position 1)
        await expect(permissionService.hasChannelPermission(MEMBER_ID, CHANNEL_ID, SEND_MESSAGES)).resolves.toBe(false);
      } finally {
        await db('permission_overwrites').where('channel_id', CHANNEL_ID).del();
      }
    });

    it('an overwrite cannot resurrect permissions the owner never had', async () => {
      // MEMBER2 does not decide MANAGE_MESSAGES_TEXT anywhere; a member overwrite
      // that allows it does take effect (overwrites are independent of role state)
      await insertOverwrite(MEMBER2_ID, 'member', MANAGE_MESSAGES_TEXT, 0n);
      try {
        await expect(permissionService.hasChannelPermission(MEMBER2_ID, CHANNEL_ID, MANAGE_MESSAGES_TEXT)).resolves.toBe(true);
      } finally {
        await db('permission_overwrites').where('channel_id', CHANNEL_ID).del();
      }
    });

    it('denies unknown channels', async () => {
      await expect(permissionService.resolveChannelPermission(OWNER_ID, '9999999999999999999', SEND_MESSAGES)).resolves.toBe('deny');
    });
  });

  describe('calculateEffectivePermissions', () => {
    it('returns all permissions for the owner', async () => {
      const result = await permissionService.calculateEffectivePermissions(OWNER_ID, SERVER_ID);
      expect(result.allow).toBeGreaterThan(0n);
      expect(result.deny).toBe(0n);
      expect(result.allow & SEND_MESSAGES).toBe(SEND_MESSAGES);
    });

    it('unions role decisions by position', async () => {
      const result = await permissionService.calculateEffectivePermissions(MEMBER_ID, SERVER_ID);
      // High role decided first: KICK allowed, SEND denied; low role adds nothing new
      expect(result.allow & KICK_MEMBERS).toBe(KICK_MEMBERS);
      expect(result.deny & SEND_MESSAGES).toBe(SEND_MESSAGES);
      expect(result.allow & VIEW_CHANNEL).toBe(VIEW_CHANNEL); // from @everyone
    });
  });

  describe('overwrite CRUD', () => {
    it('setOverwrite inserts then updates on conflict', async () => {
      const created = await permissionService.setOverwrite({
        channelId: CHANNEL_ID,
        targetId: LOW_ROLE_ID,
        targetType: 'role',
        allow: SEND_MESSAGES,
        deny: 0n,
      });
      expect(String(created.allow)).toBe(SEND_MESSAGES.toString());

      const updated = await permissionService.setOverwrite({
        channelId: CHANNEL_ID,
        targetId: LOW_ROLE_ID,
        targetType: 'role',
        allow: 0n,
        deny: SEND_MESSAGES,
      });
      expect(String(updated.deny)).toBe(SEND_MESSAGES.toString());

      // Only one row per (channel, target)
      const rows = await db('permission_overwrites')
        .where('channel_id', CHANNEL_ID)
        .where('target_id', LOW_ROLE_ID);
      expect(rows).toHaveLength(1);
    });

    it('updateOverwrite throws for a missing overwrite', async () => {
      await expect(
        permissionService.updateOverwrite(CHANNEL_ID, '9999999999999999998', { allow: SEND_MESSAGES })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('setOverwritePermission flips a single bit without disturbing others', async () => {
      await permissionService.setOverwrite({
        channelId: CHANNEL_ID,
        targetId: LOW_ROLE_ID,
        targetType: 'role',
        allow: SEND_MESSAGES,
        deny: 0n,
      });

      await permissionService.setOverwritePermission(
        CHANNEL_ID,
        LOW_ROLE_ID,
        'role',
        CONNECT,
        'allow'
      );
      await permissionService.setOverwritePermission(
        CHANNEL_ID,
        LOW_ROLE_ID,
        'role',
        SEND_MESSAGES,
        'deny'
      );

      const row = await permissionService.getOverwrite(CHANNEL_ID, LOW_ROLE_ID);
      expect(String(row?.allow)).toBe(CONNECT.toString());
      expect(String(row?.deny)).toBe(SEND_MESSAGES.toString());
    });

    it('deleteOverwrite removes the row', async () => {
      await permissionService.setOverwrite({
        channelId: CHANNEL_ID,
        targetId: LOW_ROLE_ID,
        targetType: 'role',
        allow: SEND_MESSAGES,
        deny: 0n,
      });
      await permissionService.deleteOverwrite(CHANNEL_ID, LOW_ROLE_ID);
      expect(await permissionService.getOverwrite(CHANNEL_ID, LOW_ROLE_ID)).toBeNull();
    });
  });

  describe('getMemberRolesSorted', () => {
    it('includes @everyone and orders by position descending', async () => {
      const roles = await permissionService.getMemberRolesSorted(MEMBER_ID, SERVER_ID);
      expect(roles.map((r) => r.id)).toEqual([HIGH_ROLE_ID, LOW_ROLE_ID, EVERYONE_ROLE_ID]);
    });

    it('returns an empty list for non-members (no implicit @everyone)', async () => {
      const roles = await permissionService.getMemberRolesSorted('9999990000000999999', SERVER_ID);
      expect(roles).toEqual([]);
    });
  });
});
