import type { Knex } from 'knex';

/**
 * Create sessions table
 *
 * This table stores active user sessions for authentication.
 * Sessions are used for maintaining logged-in state.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Session token (unique identifier for the session)
    table.string('session_token', 255).unique().notNullable().comment('Unique session token');

    // Foreign key to users table
    table.string('user_id', 20).notNullable().comment('Reference to users.id');

    // Device and connection information
    table.string('device_name', 100).nullable().comment('Device name (e.g., "iPhone 13")');
    table.string('device_type', 50).nullable().comment('Device type (e.g., "mobile", "desktop")');
    table.string('ip_address', 45).nullable().comment('IP address (supports IPv6)');
    table.text('user_agent').nullable().comment('Browser/client user agent string');

    // Session expiration
    table.timestamp('expires_at', { useTz: true }).notNullable().comment('Session expiration timestamp');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Foreign key constraint
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('session_token', 'idx_sessions_token');
    table.index('user_id', 'idx_sessions_user_id');
    table.index('expires_at', 'idx_sessions_expires_at');
    table.index(['user_id', 'expires_at'], 'idx_sessions_user_expires');
  });

  // Add comment to table
  await knex.raw(`COMMENT ON TABLE sessions IS 'Active user sessions for authentication'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
}

