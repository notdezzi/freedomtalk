import type { Knex } from 'knex';

/**
 * Migration: Add Performance Optimization Indexes
 *
 * This migration adds additional indexes to improve query performance for:
 * - Message retrieval and pagination
 * - Reaction queries
 * - DM channel lookups
 * - User presence and status
 * - Attachment and embed queries
 *
 * Also adds partial indexes for common filtering patterns.
 *
 * Note: For production, consider running index creation with CONCURRENTLY
 * outside of a transaction to avoid locking. This migration uses regular
 * indexes for simplicity.
 */
export async function up(knex: Knex): Promise<void> {
  // ==================== MESSAGES TABLE ====================

  // Partial index for non-deleted messages (most common query pattern)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_messages_channel_active
    ON messages (channel_id, created_at DESC)
    WHERE is_deleted = false
  `);

  // Partial index for pinned messages (common query for channel pins)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_messages_pinned
    ON messages (channel_id, created_at DESC)
    WHERE is_pinned = true AND is_deleted = false
  `);

  // Index for DM messages lookup
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_messages_dm_channel
    ON messages (dm_channel_id, created_at DESC)
    WHERE dm_channel_id IS NOT NULL AND is_deleted = false
  `);

  // ==================== REACTIONS TABLE ====================

  // Composite index for reaction counts by message
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_reactions_message_emoji_type
    ON reactions (message_id, emoji_type)
  `);

  // Index for user's reactions (for "my reactions" queries)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_reactions_user_created
    ON reactions (user_id, created_at DESC)
  `);

  // ==================== DM CHANNELS TABLE ====================

  // Index for owner's group DMs
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_dm_channels_owner
    ON dm_channels (owner_id)
    WHERE type = 'group_dm'
  `);

  // Index for DM channel lookups by type
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_dm_channels_type
    ON dm_channels (type, created_at DESC)
  `);

  // ==================== MESSAGE ATTACHMENTS TABLE ====================

  // Index for finding attachments by type (images, videos, etc.)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_attachments_mime_type
    ON message_attachments (mime_type, created_at DESC)
  `);

  // Index for finding attachments without thumbnails
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_attachments_no_thumbnail
    ON message_attachments (id)
    WHERE thumbnail_path IS NULL AND mime_type LIKE 'image/%'
  `);

  // ==================== MESSAGE EMBEDS TABLE ====================

  // Index for embed lookups by type
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_embeds_type
    ON message_embeds (type, created_at DESC)
  `);

  // ==================== CUSTOM EMOJIS TABLE ====================

  // Index for server emojis
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_emojis_server_animated
    ON custom_emojis (server_id, animated)
  `);

  // ==================== USERS TABLE ====================

  // Partial index for active users (not suspended/deleted)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_active_status
    ON users (id, username)
    WHERE account_status = 'active'
  `);

  // ==================== ANALYZE TABLES ====================
  // Update statistics for query planner

  await knex.raw('ANALYZE messages');
  await knex.raw('ANALYZE reactions');
  await knex.raw('ANALYZE dm_channels');
  await knex.raw('ANALYZE dm_channel_participants');
  await knex.raw('ANALYZE message_attachments');
  await knex.raw('ANALYZE message_embeds');
  await knex.raw('ANALYZE custom_emojis');
  await knex.raw('ANALYZE users');
}

export async function down(knex: Knex): Promise<void> {
  // Drop all indexes in reverse order

  // Users
  await knex.raw('DROP INDEX IF EXISTS idx_users_active_status');

  // Custom emojis
  await knex.raw('DROP INDEX IF EXISTS idx_emojis_server_animated');

  // Embeds
  await knex.raw('DROP INDEX IF EXISTS idx_embeds_type');

  // Attachments
  await knex.raw('DROP INDEX IF EXISTS idx_attachments_no_thumbnail');
  await knex.raw('DROP INDEX IF EXISTS idx_attachments_mime_type');

  // DM Channels
  await knex.raw('DROP INDEX IF EXISTS idx_dm_channels_type');
  await knex.raw('DROP INDEX IF EXISTS idx_dm_channels_owner');

  // Reactions
  await knex.raw('DROP INDEX IF EXISTS idx_reactions_user_created');
  await knex.raw('DROP INDEX IF EXISTS idx_reactions_message_emoji_type');

  // Messages
  await knex.raw('DROP INDEX IF EXISTS idx_messages_dm_channel');
  await knex.raw('DROP INDEX IF EXISTS idx_messages_pinned');
  await knex.raw('DROP INDEX IF EXISTS idx_messages_channel_active');
}
