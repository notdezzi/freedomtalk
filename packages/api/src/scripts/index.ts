/**
 * Database Utility Scripts
 *
 * This module exports cleanup and maintenance scripts for the FreedomTalk API.
 * Each script can be run independently via npx tsx.
 *
 * Available Scripts:
 *
 * 1. cleanup-orphaned-attachments.ts
 *    - Removes MinIO objects that have no corresponding database records
 *    - Usage: npx tsx src/scripts/cleanup-orphaned-attachments.ts [--dry-run]
 *
 * 2. vacuum-dm-channels.ts
 *    - Removes DM channels with no active participants
 *    - Usage: npx tsx src/scripts/vacuum-dm-channels.ts [--dry-run] [--days=30]
 *
 * 3. regenerate-thumbnails.ts
 *    - Regenerates missing thumbnails for image attachments
 *    - Usage: npx tsx src/scripts/regenerate-thumbnails.ts [--dry-run] [--size=200]
 *
 * 4. cleanup-old-reactions.ts
 *    - Removes reactions older than a specified number of days
 *    - Usage: npx tsx src/scripts/cleanup-old-reactions.ts [--dry-run] [--days=365] [--server-id=xxx]
 *
 * Common Options:
 *   --dry-run    Preview changes without making them
 *   --days=N     Specify minimum age in days
 *   --size=N     Specify thumbnail size in pixels
 *   --server-id  Limit operation to a specific server
 */

export const SCRIPTS = {
  CLEANUP_ORPHANED_ATTACHMENTS: 'cleanup-orphaned-attachments',
  VACUUM_DM_CHANNELS: 'vacuum-dm-channels',
  REGENERATE_THUMBNAILS: 'regenerate-thumbnails',
  CLEANUP_OLD_REACTIONS: 'cleanup-old-reactions',
} as const;

export type ScriptName = (typeof SCRIPTS)[keyof typeof SCRIPTS];
