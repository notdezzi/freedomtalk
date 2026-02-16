export async function up(knex) {
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_messages_channel_active
    ON messages (channel_id, created_at DESC)
    WHERE is_deleted = false
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_messages_pinned
    ON messages (channel_id, created_at DESC)
    WHERE is_pinned = true AND is_deleted = false
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_messages_dm_channel
    ON messages (dm_channel_id, created_at DESC)
    WHERE dm_channel_id IS NOT NULL AND is_deleted = false
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_reactions_message_emoji_type
    ON reactions (message_id, emoji_type)
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_reactions_user_created
    ON reactions (user_id, created_at DESC)
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_dm_channels_owner
    ON dm_channels (owner_id)
    WHERE type = 'group_dm'
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_dm_channels_type
    ON dm_channels (type, created_at DESC)
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_attachments_mime_type
    ON message_attachments (mime_type, created_at DESC)
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_attachments_no_thumbnail
    ON message_attachments (id)
    WHERE thumbnail_path IS NULL AND mime_type LIKE 'image/%'
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_embeds_type
    ON message_embeds (type, created_at DESC)
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_emojis_server_animated
    ON custom_emojis (server_id, animated)
  `);
    await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_active_status
    ON users (id, username)
    WHERE account_status = 'active'
  `);
    await knex.raw('ANALYZE messages');
    await knex.raw('ANALYZE reactions');
    await knex.raw('ANALYZE dm_channels');
    await knex.raw('ANALYZE dm_channel_participants');
    await knex.raw('ANALYZE message_attachments');
    await knex.raw('ANALYZE message_embeds');
    await knex.raw('ANALYZE custom_emojis');
    await knex.raw('ANALYZE users');
}
export async function down(knex) {
    await knex.raw('DROP INDEX IF EXISTS idx_users_active_status');
    await knex.raw('DROP INDEX IF EXISTS idx_emojis_server_animated');
    await knex.raw('DROP INDEX IF EXISTS idx_embeds_type');
    await knex.raw('DROP INDEX IF EXISTS idx_attachments_no_thumbnail');
    await knex.raw('DROP INDEX IF EXISTS idx_attachments_mime_type');
    await knex.raw('DROP INDEX IF EXISTS idx_dm_channels_type');
    await knex.raw('DROP INDEX IF EXISTS idx_dm_channels_owner');
    await knex.raw('DROP INDEX IF EXISTS idx_reactions_user_created');
    await knex.raw('DROP INDEX IF EXISTS idx_reactions_message_emoji_type');
    await knex.raw('DROP INDEX IF EXISTS idx_messages_dm_channel');
    await knex.raw('DROP INDEX IF EXISTS idx_messages_pinned');
    await knex.raw('DROP INDEX IF EXISTS idx_messages_channel_active');
}
//# sourceMappingURL=20260217011000_add_performance_indexes.js.map