import type { Knex } from 'knex';

/**
 * Create user_profiles table
 *
 * This table stores user profile information with a one-to-one relationship to users.
 * Includes display customization fields like avatar, banner, bio, etc.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_profiles', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Foreign key to users table (one-to-one relationship)
    table.string('user_id', 20).unique().notNullable().comment('Reference to users.id');

    // Profile fields
    table.string('display_name', 100).nullable().comment('Display name (can differ from username)');
    table.text('bio').nullable().comment('User biography/about me');
    table.string('pronouns', 50).nullable().comment('User pronouns');

    // Media URLs
    table.string('avatar_url', 500).nullable().comment('Profile avatar image URL');
    table.string('banner_url', 500).nullable().comment('Profile banner image URL');
    table.string('splash_url', 500).nullable().comment('Profile splash/background image URL');

    // Status
    table.string('custom_status', 200).nullable().comment('Custom status message');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Foreign key constraint with CASCADE delete
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id', 'idx_user_profiles_user_id');
    table.index('display_name', 'idx_user_profiles_display_name');
  });

  // Add comment to table
  await knex.raw(`COMMENT ON TABLE user_profiles IS 'User profile information and customization'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_profiles');
}

