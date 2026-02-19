import type { Knex } from 'knex';

/**
 * Add DM privacy level to users table
 *
 * This migration adds DM privacy settings to control who can send direct messages to a user.
 * Privacy levels:
 * - 'open': Anyone can send DMs
 * - 'friends_only': Only friends can send DMs (default)
 * - 'none': No one can send DMs
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table
      .text('dm_privacy_level')
      .notNullable()
      .defaultTo('friends_only')
      .comment('DM privacy level: open, friends_only, none');
  });

  // Add check constraint for valid privacy levels
  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT chk_dm_privacy_level
    CHECK (dm_privacy_level IN ('open', 'friends_only', 'none'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop check constraint first
  await knex.raw(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_dm_privacy_level`);

  // Drop the column
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('dm_privacy_level');
  });
}
