import type { Knex } from 'knex';

/**
 * Migration: Create dm_channels table
 *
 * This table stores Direct Message (DM) channels including:
 * - 1-on-1 DMs (type='dm')
 * - Group DMs (type='group_dm', 2-10 participants)
 *
 * DM channels are separate from server channels and exist independently.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dm_channels', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Channel type
    table
      .string('type', 10)
      .notNullable()
      .comment("DM type: 'dm' (1-on-1) or 'group_dm' (2-10 participants)");

    // Group DM metadata (nullable for 1-on-1 DMs)
    table
      .string('name', 100)
      .nullable()
      .comment('Group DM name (nullable for 1-on-1 DMs, required for group DMs)');
    table.string('icon_url', 500).nullable().comment('Group DM icon URL (optional)');

    // Owner reference (for group DMs)
    table
      .string('owner_id', 20)
      .nullable()
      .comment('User ID of group DM owner (nullable for 1-on-1 DMs)')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    // Timestamps
    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('When the DM channel was created');
    table
      .timestamp('updated_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('When the DM channel was last updated');

    // Indexes for common query patterns
    table.index('type', 'idx_dm_channels_type');
    table.index('owner_id', 'idx_dm_channels_owner_id');
    table.index('created_at', 'idx_dm_channels_created_at');

    // Check constraints
    table.check(
      "type IN ('dm', 'group_dm')",
      [],
      'chk_dm_channel_type'
    );
    table.check(
      "type = 'dm' OR (type = 'group_dm' AND owner_id IS NOT NULL)",
      [],
      'chk_dm_channel_group_has_owner'
    );
    table.check(
      'name IS NULL OR (char_length(name) >= 1 AND char_length(name) <= 100)',
      [],
      'chk_dm_channel_name_length'
    );

    // Table comment
    table.comment('Stores DM and Group DM channels');
  });

  // Add table comment
  await knex.raw(
    `COMMENT ON TABLE dm_channels IS 'Direct message channels (1-on-1 and group DMs)'`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dm_channels');
}

