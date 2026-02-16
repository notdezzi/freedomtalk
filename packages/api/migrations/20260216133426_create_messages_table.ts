import type { Knex } from 'knex';

/**
 * Migration: Create messages table
 *
 * This table stores all messages in the system with support for:
 * - Snowflake IDs for distributed uniqueness and time-ordering
 * - Soft delete functionality
 * - Edit tracking (is_edited, edited_at)
 * - Pinned messages
 * - Foreign key to users (author)
 * - Nullable channel_id (channels don't exist yet, will be added in Phase 3)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('messages', (table) => {
    // Primary key - Snowflake ID (20-character string)
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Message content
    table.text('content').notNullable().comment('Message content (max 2000 characters)');

    // Author reference
    table
      .string('author_id', 20)
      .notNullable()
      .comment('User ID of message author')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Channel reference (nullable - channels don't exist yet, will be added in Phase 3)
    table.string('channel_id', 20).nullable().comment('Channel ID (nullable for DM messages)');

    // Edit tracking
    table.boolean('is_edited').defaultTo(false).notNullable().comment('Whether message has been edited');
    table.timestamp('edited_at', { useTz: true }).nullable().comment('When message was last edited');

    // Soft delete
    table.boolean('is_deleted').defaultTo(false).notNullable().comment('Soft delete flag');
    table.timestamp('deleted_at', { useTz: true }).nullable().comment('When message was soft deleted');

    // Pinned status
    table.boolean('is_pinned').defaultTo(false).notNullable().comment('Whether message is pinned');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Creation timestamp');
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Last update timestamp');

    // Indexes for common query patterns
    table.index('author_id', 'idx_messages_author_id');
    table.index('channel_id', 'idx_messages_channel_id');
    table.index('created_at', 'idx_messages_created_at');
    table.index(['channel_id', 'created_at'], 'idx_messages_channel_created');
    table.index('is_deleted', 'idx_messages_deleted');

    // Table comment
    table.comment('Stores all messages with soft delete and edit tracking');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('messages');
}

