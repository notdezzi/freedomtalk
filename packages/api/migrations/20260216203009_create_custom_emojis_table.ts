import type { Knex } from 'knex';

/**
 * Migration: Create custom_emojis table
 *
 * This table stores server-specific custom emojis that can be used in:
 * - Messages
 * - Reactions
 * - Server customization
 *
 * Custom emojis are scoped to servers and can be animated or static.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('custom_emojis', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Server reference
    table
      .string('server_id', 20)
      .notNullable()
      .comment('ID of the server this emoji belongs to')
      .references('id')
      .inTable('servers')
      .onDelete('CASCADE');

    // Emoji metadata
    table
      .string('name', 32)
      .notNullable()
      .comment('Emoji name (2-32 characters, alphanumeric and underscores only)');
    table.string('image_url', 500).notNullable().comment('URL to emoji image in MinIO');
    table.boolean('animated').defaultTo(false).notNullable().comment('Whether emoji is animated (GIF)');

    // Creator reference
    table
      .string('created_by', 20)
      .notNullable()
      .comment('User ID who created the emoji')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    // Timestamps
    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('When the emoji was created');
    table
      .timestamp('updated_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('When the emoji was last updated');

    // Indexes for common query patterns
    table.index('server_id', 'idx_custom_emojis_server_id');
    table.index('name', 'idx_custom_emojis_name');
    table.index('created_by', 'idx_custom_emojis_created_by');
    table.index('created_at', 'idx_custom_emojis_created_at');

    // Unique constraint: emoji name must be unique within a server
    table.unique(['server_id', 'name'], { indexName: 'idx_custom_emojis_server_name_unique' });

    // Check constraints
    table.check(
      "name ~ '^[a-zA-Z0-9_]+$'",
      [],
      'chk_custom_emoji_name_format'
    );
    table.check(
      'char_length(name) >= 2 AND char_length(name) <= 32',
      [],
      'chk_custom_emoji_name_length'
    );

    // Table comment
    table.comment('Stores server-specific custom emojis');
  });

  // Add table comment
  await knex.raw(
    `COMMENT ON TABLE custom_emojis IS 'Server-specific custom emojis for messages and reactions'`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('custom_emojis');
}

