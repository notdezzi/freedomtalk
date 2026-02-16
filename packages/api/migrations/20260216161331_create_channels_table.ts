import type { Knex } from 'knex';

/**
 * Migration: Create channels table
 *
 * This table stores channel information within servers.
 * Channels are where messages are sent and organized by topic/purpose.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('channels', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Server reference
    table
      .string('server_id', 20)
      .notNullable()
      .comment('Server ID this channel belongs to')
      .references('id')
      .inTable('servers')
      .onDelete('CASCADE');

    // Channel information
    table.string('name', 100).notNullable().comment('Channel name (1-100 characters)');
    table
      .string('type', 20)
      .notNullable()
      .defaultTo('text')
      .comment('Channel type: text, voice, announcement');
    table.text('topic').nullable().comment('Channel topic/description (optional)');
    table.integer('position').notNullable().defaultTo(0).comment('Display position/order within server');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Creation timestamp');
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Last update timestamp');

    // Indexes for common query patterns
    table.index('server_id', 'idx_channels_server_id');
    table.index('name', 'idx_channels_name');
    table.index('type', 'idx_channels_type');
    table.index(['server_id', 'position'], 'idx_channels_server_position');
    table.index('created_at', 'idx_channels_created_at');

    // Constraints
    table.check('char_length(name) >= 1 AND char_length(name) <= 100', [], 'chk_channel_name_length');
    table.check("type IN ('text', 'voice', 'announcement')", [], 'chk_channel_type');
    table.check('position >= 0', [], 'chk_channel_position');

    // Table comment
    table.comment('Stores channel information within servers');
  });

  // Add comment to table
  await knex.raw(`COMMENT ON TABLE channels IS 'Channel information within servers for organizing messages'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('channels');
}

