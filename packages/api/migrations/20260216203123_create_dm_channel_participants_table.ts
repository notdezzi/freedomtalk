import type { Knex } from 'knex';

/**
 * Migration: Create dm_channel_participants table
 *
 * This table manages participants in DM channels:
 * - Tracks who is in each DM/Group DM
 * - Supports soft delete (users can leave and rejoin)
 * - Prevents duplicate active participants
 * - Enables efficient querying of user's DMs
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dm_channel_participants', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // DM Channel reference
    table
      .string('dm_channel_id', 20)
      .notNullable()
      .comment('ID of the DM channel')
      .references('id')
      .inTable('dm_channels')
      .onDelete('CASCADE');

    // User reference
    table
      .string('user_id', 20)
      .notNullable()
      .comment('ID of the participant user')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Participation status
    table
      .timestamp('joined_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('When the user joined the DM channel');
    table
      .timestamp('left_at', { useTz: true })
      .nullable()
      .comment('When the user left the DM channel (null if still active)');
    table
      .boolean('is_active')
      .defaultTo(true)
      .notNullable()
      .comment('Whether the user is currently an active participant');

    // Indexes for common query patterns
    table.index('dm_channel_id', 'idx_dm_participants_channel_id');
    table.index('user_id', 'idx_dm_participants_user_id');
    table.index(['dm_channel_id', 'user_id'], 'idx_dm_participants_channel_user');
    table.index('is_active', 'idx_dm_participants_active');
    table.index(['user_id', 'is_active'], 'idx_dm_participants_user_active');

    // Table comment
    table.comment('Tracks participants in DM channels');
  });

  // Add table comment
  await knex.raw(
    `COMMENT ON TABLE dm_channel_participants IS 'Participants in DM and Group DM channels'`
  );

  // Create unique partial index: only one active participation per user per channel
  // This allows users to leave and rejoin, but prevents duplicate active participants
  await knex.raw(`
    CREATE UNIQUE INDEX idx_dm_participants_active_unique 
    ON dm_channel_participants (dm_channel_id, user_id) 
    WHERE is_active = true
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the partial unique index first
  await knex.raw('DROP INDEX IF EXISTS idx_dm_participants_active_unique');
  
  // Drop the table
  await knex.schema.dropTableIfExists('dm_channel_participants');
}

