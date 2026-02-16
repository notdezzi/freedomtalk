import type { Knex } from 'knex';

/**
 * Migration: Add dm_channel_id to messages table
 *
 * Adds the dm_channel_id foreign key to support DM messages.
 * Messages can belong to either a channel OR a DM channel.
 */
export async function up(knex: Knex): Promise<void> {
  // Add dm_channel_id column to messages
  await knex.schema.alterTable('messages', (table) => {
    table
      .string('dm_channel_id', 20)
      .nullable()
      .references('id')
      .inTable('dm_channels')
      .onDelete('CASCADE')
      .comment('DM Channel ID for direct messages (null for channel messages)');

    // Add index for DM channel queries
    table.index('dm_channel_id', 'idx_messages_dm_channel_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('messages', (table) => {
    table.dropIndex('dm_channel_id', 'idx_messages_dm_channel_id');
    table.dropColumn('dm_channel_id');
  });
}
