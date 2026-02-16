import type { Knex } from 'knex';

/**
 * Create users table
 *
 * This table stores core user authentication and account information.
 * Uses snowflake IDs for distributed uniqueness and time-ordering.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Authentication fields
    table.string('email', 255).unique().notNullable().comment('User email address');
    table.string('username', 32).unique().notNullable().comment('Unique username (3-32 chars)');
    table.string('password_hash', 255).notNullable().comment('Bcrypt password hash');

    // Email verification
    table.boolean('email_verified').defaultTo(false).notNullable().comment('Email verification status');

    // Multi-factor authentication
    table.boolean('mfa_enabled').defaultTo(false).notNullable().comment('MFA enabled status');
    table.string('mfa_secret', 255).nullable().comment('TOTP secret for MFA');

    // Account status
    table.string('account_status', 20).defaultTo('active').notNullable().comment('Account status: active, suspended, deleted');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('email', 'idx_users_email');
    table.index('username', 'idx_users_username');
    table.index('created_at', 'idx_users_created_at');
    table.index('account_status', 'idx_users_account_status');

    // Constraints
    table.check('char_length(username) >= 3 AND char_length(username) <= 32', [], 'chk_username_length');
    table.check("account_status IN ('active', 'suspended', 'deleted')", [], 'chk_account_status');
  });

  // Add comment to table
  await knex.raw(`COMMENT ON TABLE users IS 'Core user authentication and account information'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}

