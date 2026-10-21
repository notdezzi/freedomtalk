/**
 * Permission Utils Unit Tests
 * Pure bitfield logic — no database required
 */

import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getPermissionState,
  setPermission,
  clearPermission,
  applyOverwrite,
  mergePermissions,
  resolvePermissionFromMasks,
  permissionToString,
  stringToPermission,
  hasAdministrator,
  getPermissionFlags,
  getPermissionNames,
  calculateEffectiveFromRoles,
  hasAllPermissions,
  hasAnyPermission,
  getAllPermissionFlags,
} from '../permission.utils';
import { PERMISSION_FLAGS, ALL_PERMISSIONS } from '@freedomtalk/shared';

const { SEND_MESSAGES, VIEW_CHANNEL, CONNECT, SPEAK, MANAGE_MESSAGES_TEXT, ADMINISTRATOR, KICK_MEMBERS } =
  PERMISSION_FLAGS;

describe('hasPermission', () => {
  it('returns true when the flag is set', () => {
    expect(hasPermission(SEND_MESSAGES, SEND_MESSAGES)).toBe(true);
  });

  it('returns false when the flag is not set', () => {
    expect(hasPermission(0n, SEND_MESSAGES)).toBe(false);
  });

  it('returns true for any flag when ADMINISTRATOR is set', () => {
    expect(hasPermission(ADMINISTRATOR, KICK_MEMBERS)).toBe(true);
    expect(hasPermission(ADMINISTRATOR, SEND_MESSAGES)).toBe(true);
  });

  it('does not treat unrelated flags as a match', () => {
    expect(hasPermission(VIEW_CHANNEL, SEND_MESSAGES)).toBe(false);
  });
});

describe('getPermissionState', () => {
  it('returns allow when set in the allow mask only', () => {
    expect(getPermissionState(SEND_MESSAGES, 0n, SEND_MESSAGES)).toBe('allow');
  });

  it('returns deny when set in the deny mask only', () => {
    expect(getPermissionState(0n, SEND_MESSAGES, SEND_MESSAGES)).toBe('deny');
  });

  it('returns neutral when set in neither mask', () => {
    expect(getPermissionState(0n, 0n, SEND_MESSAGES)).toBe('neutral');
  });

  it('returns allow when set in both masks (allow wins)', () => {
    expect(getPermissionState(SEND_MESSAGES, SEND_MESSAGES, SEND_MESSAGES)).toBe('allow');
  });

  it('is flag-isolated: a different set bit does not change the state', () => {
    expect(getPermissionState(VIEW_CHANNEL, CONNECT, SEND_MESSAGES)).toBe('neutral');
    expect(getPermissionState(VIEW_CHANNEL | SEND_MESSAGES, CONNECT, SEND_MESSAGES)).toBe('allow');
  });
});

describe('setPermission', () => {
  it('allow sets the bit in allow and clears it from deny', () => {
    const result = setPermission(0n, SEND_MESSAGES, SEND_MESSAGES, 'allow');
    expect(result.allow & SEND_MESSAGES).toBe(SEND_MESSAGES);
    expect(result.deny & SEND_MESSAGES).toBe(0n);
  });

  it('deny sets the bit in deny and clears it from allow', () => {
    const result = setPermission(SEND_MESSAGES, 0n, SEND_MESSAGES, 'deny');
    expect(result.allow & SEND_MESSAGES).toBe(0n);
    expect(result.deny & SEND_MESSAGES).toBe(SEND_MESSAGES);
  });

  it('neutral clears the bit from both masks', () => {
    const result = setPermission(SEND_MESSAGES, SEND_MESSAGES, SEND_MESSAGES, 'neutral');
    expect(result.allow & SEND_MESSAGES).toBe(0n);
    expect(result.deny & SEND_MESSAGES).toBe(0n);
  });

  it('does not disturb other flags', () => {
    const start = { allow: SEND_MESSAGES | VIEW_CHANNEL, deny: CONNECT };
    const result = setPermission(start.allow, start.deny, SEND_MESSAGES, 'deny');
    expect(result.allow & VIEW_CHANNEL).toBe(VIEW_CHANNEL);
    expect(result.deny & CONNECT).toBe(CONNECT);
    expect(result.deny & SEND_MESSAGES).toBe(SEND_MESSAGES);
  });
});

describe('clearPermission', () => {
  it('removes the flag from both masks', () => {
    const result = clearPermission(SEND_MESSAGES, SEND_MESSAGES, SEND_MESSAGES);
    expect(result.allow).toBe(0n);
    expect(result.deny).toBe(0n);
  });
});

describe('applyOverwrite', () => {
  it('grants an allowed permission', () => {
    expect(applyOverwrite(0n, SEND_MESSAGES, 0n) & SEND_MESSAGES).toBe(SEND_MESSAGES);
  });

  it('removes a denied permission', () => {
    expect(applyOverwrite(SEND_MESSAGES, 0n, SEND_MESSAGES) & SEND_MESSAGES).toBe(0n);
  });

  it('allow takes precedence over deny within the same overwrite', () => {
    expect(applyOverwrite(0n, SEND_MESSAGES, SEND_MESSAGES) & SEND_MESSAGES).toBe(SEND_MESSAGES);
  });

  it('leaves neutral permissions untouched', () => {
    expect(applyOverwrite(SEND_MESSAGES, VIEW_CHANNEL, CONNECT) & SEND_MESSAGES).toBe(SEND_MESSAGES);
  });
});

describe('mergePermissions', () => {
  it('unions allow and deny masks', () => {
    const result = mergePermissions(
      { allow: SEND_MESSAGES, deny: CONNECT },
      { allow: VIEW_CHANNEL, deny: SPEAK }
    );
    expect(result.allow).toBe(SEND_MESSAGES | VIEW_CHANNEL);
    expect(result.deny).toBe(CONNECT | SPEAK);
  });

  it('returns zero masks when merging nothing', () => {
    expect(mergePermissions()).toEqual({ allow: 0n, deny: 0n });
  });
});

describe('resolvePermissionFromMasks', () => {
  it('resolves neutral to deny (secure by default)', () => {
    expect(resolvePermissionFromMasks(0n, 0n, SEND_MESSAGES)).toBe('deny');
  });

  it('resolves explicit allow and deny', () => {
    expect(resolvePermissionFromMasks(SEND_MESSAGES, 0n, SEND_MESSAGES)).toBe('allow');
    expect(resolvePermissionFromMasks(0n, SEND_MESSAGES, SEND_MESSAGES)).toBe('deny');
  });
});

describe('permission string round-trip', () => {
  it('round-trips bigint values through strings', () => {
    const value = SEND_MESSAGES | ADMINISTRATOR | (1n << 100n); // beyond Number.MAX_SAFE_INTEGER
    expect(stringToPermission(permissionToString(value))).toBe(value);
  });

  it('stringToPermission returns 0n for null/undefined', () => {
    expect(stringToPermission(null)).toBe(0n);
    expect(stringToPermission(undefined)).toBe(0n);
  });

  it('stringToPermission returns 0n for garbage input', () => {
    expect(stringToPermission('not-a-number')).toBe(0n);
  });

  it('stringToPermission accepts numbers', () => {
    expect(stringToPermission(4096)).toBe(SEND_MESSAGES);
  });
});

describe('hasAdministrator', () => {
  it('detects the administrator bit', () => {
    expect(hasAdministrator(ADMINISTRATOR)).toBe(true);
    expect(hasAdministrator(ADMINISTRATOR | SEND_MESSAGES)).toBe(true);
  });

  it('returns false without the bit', () => {
    expect(hasAdministrator(SEND_MESSAGES)).toBe(false);
    expect(hasAdministrator(0n)).toBe(false);
  });
});

describe('calculateEffectiveFromRoles', () => {
  it('empty role list resolves to no permissions', () => {
    expect(calculateEffectiveFromRoles([])).toEqual({ allow: 0n, deny: 0n });
  });

  it('higher-position roles win for undecided permissions', () => {
    const roles = [
      { allow: SEND_MESSAGES, deny: 0n, position: 1 },
      { allow: VIEW_CHANNEL | CONNECT, deny: 0n, position: 5 },
    ];
    const result = calculateEffectiveFromRoles(roles);
    expect(result.allow).toBe(SEND_MESSAGES | VIEW_CHANNEL | CONNECT);
    expect(result.deny).toBe(0n);
  });

  it('decisions flow from the highest position down; lower roles cannot override', () => {
    const high = { allow: 0n, deny: SEND_MESSAGES, position: 10 };
    const low = { allow: SEND_MESSAGES, deny: 0n, position: 1 };
    const result = calculateEffectiveFromRoles([low, high]);
    // High role decided deny first; low role cannot override
    expect(result.deny & SEND_MESSAGES).toBe(SEND_MESSAGES);
    expect(result.allow & SEND_MESSAGES).toBe(0n);
  });

  it('input order does not matter (positions drive resolution)', () => {
    const a = { allow: SEND_MESSAGES, deny: 0n, position: 3 };
    const b = { allow: VIEW_CHANNEL, deny: 0n, position: 7 };
    expect(calculateEffectiveFromRoles([a, b])).toEqual(calculateEffectiveFromRoles([b, a]));
  });

  it('a deny decision by a lower role blocks a higher role allow only if decided first', () => {
    // Highest role is undecided (neutral), lower role denies -> deny sticks
    const high = { allow: 0n, deny: 0n, position: 10 };
    const low = { allow: 0n, deny: SEND_MESSAGES, position: 1 };
    const result = calculateEffectiveFromRoles([high, low]);
    expect(result.deny & SEND_MESSAGES).toBe(SEND_MESSAGES);
  });
});

describe('hasAllPermissions / hasAnyPermission', () => {
  it('hasAllPermissions requires every flag (or administrator)', () => {
    const perms = SEND_MESSAGES | VIEW_CHANNEL;
    expect(hasAllPermissions(perms, SEND_MESSAGES, VIEW_CHANNEL)).toBe(true);
    expect(hasAllPermissions(perms, SEND_MESSAGES, CONNECT)).toBe(false);
    expect(hasAllPermissions(ADMINISTRATOR, SEND_MESSAGES, CONNECT)).toBe(true);
  });

  it('hasAnyPermission requires at least one flag', () => {
    const perms = SEND_MESSAGES;
    expect(hasAnyPermission(perms, SEND_MESSAGES, CONNECT)).toBe(true);
    expect(hasAnyPermission(perms, CONNECT, SPEAK)).toBe(false);
    expect(hasAnyPermission(ADMINISTRATOR, CONNECT, SPEAK)).toBe(true);
  });
});

describe('flag introspection', () => {
  it('getPermissionFlags lists only set flags', () => {
    const perms = SEND_MESSAGES | VIEW_CHANNEL;
    const flags = getPermissionFlags(perms);
    expect(flags).toContain('SEND_MESSAGES');
    expect(flags).toContain('VIEW_CHANNEL');
    expect(flags).not.toContain('ADMINISTRATOR');
  });

  it('getPermissionNames maps flags to display names', () => {
    const names = getPermissionNames(SEND_MESSAGES);
    expect(names).toContain('Send Messages');
  });

  it('getAllPermissionFlags exposes every flag', () => {
    expect(getAllPermissionFlags().length).toBe(34);
    expect(BigInt(ALL_PERMISSIONS)).toBeGreaterThan(0n);
  });
});
