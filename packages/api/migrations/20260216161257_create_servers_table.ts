import type { Knex } from 'knex';

/**
 * Migration: Create servers table (also known as guilds in Discord terminology)
 *
 * This table stores server/guild information for organizing channels and users.
 * Servers are the top-level organizational unit in the application.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('servers', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Server information
    table.string('name', 100).notNullable().comment('Server name (1-100 characters)');
    table.text('description').nullable().comment('Server description (optional)');

    // Owner reference
    table
      .string('owner_id', 20)
      .notNullable()
      .comment('User ID of server owner')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Media assets
    table.string('icon_url', 500).nullable().comment('Server icon URL');
    table.string('banner_url', 500).nullable().comment('Server banner URL');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Creation timestamp');
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Last update timestamp');

    // Indexes for common query patterns
    table.index('owner_id', 'idx_servers_owner_id');
    table.index('name', 'idx_servers_name');
    table.index('created_at', 'idx_servers_created_at');

    // Constraints
    table.check('char_length(name) >= 1 AND char_length(name) <= 100', [], 'chk_server_name_length');

    // Table comment
    table.comment('Stores server/guild information for organizing channels and users');
  });

  // Add comment to table
  await knex.raw(`COMMENT ON TABLE servers IS 'Server/guild information for organizing channels and users'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('servers');
}

