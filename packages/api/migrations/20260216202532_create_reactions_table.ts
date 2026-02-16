import type { Knex } from 'knex';

/**
 * Migration: Create reactions table
 *
 * This table stores message reactions with support for:
 * - Unicode emoji reactions (native emoji)
 * - Custom emoji reactions (server-specific emojis)
 * - Unique constraint to prevent duplicate reactions
 * - XOR constraint ensuring either emoji_id OR emoji_unicode is set
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reactions', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Message reference
    table
      .string('message_id', 20)
      .notNullable()
      .comment('ID of the message being reacted to')
      .references('id')
      .inTable('messages')
      .onDelete('CASCADE');

    // User reference
    table
      .string('user_id', 20)
      .notNullable()
      .comment('ID of the user who reacted')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Emoji type: unicode or custom
    table
      .string('emoji_type', 10)
      .notNullable()
      .comment("Type of emoji: 'unicode' or 'custom'");

    // Custom emoji ID (for server-specific emojis)
    table
      .string('emoji_id', 20)
      .nullable()
      .comment('ID of custom emoji (nullable, used when emoji_type is custom)');

    // Unicode emoji (for native emojis)
    table
      .string('emoji_unicode', 20)
      .nullable()
      .comment('Unicode representation of emoji (nullable, used when emoji_type is unicode)');

    // Timestamp
    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('When the reaction was added');

    // Indexes for common query patterns
    table.index('message_id', 'idx_reactions_message_id');
    table.index('user_id', 'idx_reactions_user_id');
    table.index(['message_id', 'emoji_type'], 'idx_reactions_message_emoji_type');

    // Check constraints
    table.check(
      "emoji_type IN ('unicode', 'custom')",
      [],
      'chk_reaction_emoji_type'
    );

    // XOR constraint: exactly one of emoji_id or emoji_unicode must be set
    table.check(
      '(emoji_id IS NOT NULL AND emoji_unicode IS NULL) OR (emoji_id IS NULL AND emoji_unicode IS NOT NULL)',
      [],
      'chk_reaction_emoji_xor'
    );

    // Table comment
    table.comment('Stores message reactions with unicode and custom emoji support');
  });

  // Add table comment
  await knex.raw(
    `COMMENT ON TABLE reactions IS 'Message reactions with support for unicode and custom emojis'`
  );

  // Create unique index with COALESCE to handle nullable emoji_id and emoji_unicode
  // This ensures one user can only react with the same emoji once per message
  await knex.raw(`
    CREATE UNIQUE INDEX idx_reactions_unique
    ON reactions (message_id, user_id, emoji_type, COALESCE(emoji_id, emoji_unicode))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reactions');
}

