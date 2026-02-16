import type { Knex } from 'knex';

/**
 * Migration: Create message_history table with TimescaleDB hypertable
 *
 * This table tracks all message edits for:
 * - Audit trails
 * - Moderation
 * - User transparency (showing edit history)
 *
 * Uses TimescaleDB hypertable for automatic time-based partitioning and compression
 * of historical data, optimizing storage and query performance for time-series data.
 */
export async function up(knex: Knex): Promise<void> {
  // First, enable TimescaleDB extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;');

  // Create the message_history table
  await knex.schema.createTable('message_history', (table) => {
    // Snowflake ID (no primary key due to TimescaleDB hypertable partitioning constraint)
    table.string('id', 20).notNullable().comment('Snowflake ID');

    // Message reference
    table
      .string('message_id', 20)
      .notNullable()
      .comment('ID of the message that was edited')
      .references('id')
      .inTable('messages')
      .onDelete('CASCADE');

    // Previous content (before edit)
    table.text('content').notNullable().comment('Previous message content before edit');

    // Editor reference
    table
      .string('edited_by', 20)
      .notNullable()
      .comment('User ID who made the edit')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Edit timestamp (used for hypertable partitioning)
    table.timestamp('edited_at', { useTz: true }).notNullable().comment('When the edit occurred');

    // Creation timestamp
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Record creation timestamp');

    // Indexes for common query patterns
    table.index('id', 'idx_message_history_id');
    table.index('message_id', 'idx_message_history_message_id');
    table.index('edited_at', 'idx_message_history_edited_at');

    // Table comment
    table.comment('Tracks message edit history with TimescaleDB hypertable optimization');
  });

  // Convert to TimescaleDB hypertable partitioned by edited_at
  await knex.raw(`
    SELECT create_hypertable(
      'message_history',
      'edited_at',
      if_not_exists => TRUE
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Dropping a hypertable automatically drops all chunks and metadata
  await knex.schema.dropTableIfExists('message_history');
}

