import type { Knex } from 'knex';

/**
 * Create password_resets table
 *
 * This table stores password reset tokens for account recovery.
 * Tokens are single-use and expire after a set period.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('password_resets', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Token hash (unique identifier)
    table.string('token_hash', 255).unique().notNullable().comment('Hashed reset token');

    // Foreign key to users table
    table.string('user_id', 20).notNullable().comment('Reference to users.id');

    // Usage tracking
    table.boolean('is_used').defaultTo(false).notNullable().comment('Whether token has been used');
    table.timestamp('used_at', { useTz: true }).nullable().comment('When token was used');

    // Token expiration
    table.timestamp('expires_at', { useTz: true }).notNullable().comment('Token expiration timestamp');

    // Security tracking
    table.string('ip_address', 45).nullable().comment('IP address that requested reset');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Foreign key constraint
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('token_hash', 'idx_password_resets_hash');
    table.index('user_id', 'idx_password_resets_user_id');
    table.index('expires_at', 'idx_password_resets_expires_at');
    table.index('is_used', 'idx_password_resets_used');
    table.index(['user_id', 'is_used', 'expires_at'], 'idx_password_resets_validation');
  });

  // Add comment to table
  await knex.raw(`COMMENT ON TABLE password_resets IS 'Password reset tokens for account recovery'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_resets');
}

