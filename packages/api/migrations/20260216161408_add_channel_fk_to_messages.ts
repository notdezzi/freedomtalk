import type { Knex } from 'knex';

/**
 * Migration: Add foreign key constraint to messages.channel_id
 *
 * This migration adds a foreign key constraint from messages.channel_id to channels.id.
 * Uses ON DELETE SET NULL to preserve messages when a channel is deleted.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('messages', (table) => {
    // Add foreign key constraint to channel_id
    table
      .foreign('channel_id')
      .references('id')
      .inTable('channels')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('messages', (table) => {
    // Drop the foreign key constraint
    table.dropForeign(['channel_id']);
  });
}

