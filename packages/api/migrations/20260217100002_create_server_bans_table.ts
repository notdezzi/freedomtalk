import type { Knex } from 'knex';

/**
 * Migration: Create server_bans table
 *
 * Tracks banned users from servers.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('server_bans', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // References
    table
      .string('server_id', 20)
      .notNullable()
      .comment('Server ID')
      .references('id')
      .inTable('servers')
      .onDelete('CASCADE');
    table
      .string('user_id', 20)
      .notNullable()
      .comment('Banned user ID')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Ban information
    table.text('reason').nullable().comment('Ban reason');
    table
      .string('banned_by', 20)
      .notNullable()
      .comment('User ID who issued the ban')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('When the ban was issued');

    // Indexes
    table.index('server_id', 'idx_server_bans_server_id');
    table.index('user_id', 'idx_server_bans_user_id');
    table.index(['server_id', 'user_id'], 'idx_server_bans_server_user');

    // Unique constraint - one ban per user per server
    table.unique(['server_id', 'user_id'], 'unq_server_bans_server_user');
  });

  await knex.raw(`COMMENT ON TABLE server_bans IS 'Server ban records'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('server_bans');
}
