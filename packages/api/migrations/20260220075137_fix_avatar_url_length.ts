import type { Knex } from "knex";

/**
 * Fix avatar_url and banner_url column lengths
 *
 * Base64 encoded images can be much longer than 500 characters,
 * so we need to change from varchar(500) to TEXT type.
 */
export async function up(knex: Knex): Promise<void> {
  // Alter avatar_url column to TEXT
  await knex.raw(`
    ALTER TABLE user_profiles
    ALTER COLUMN avatar_url TYPE TEXT
  `);

  // Alter banner_url column to TEXT as well
  await knex.raw(`
    ALTER TABLE user_profiles
    ALTER COLUMN banner_url TYPE TEXT
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Revert avatar_url to varchar(500)
  await knex.raw(`
    ALTER TABLE user_profiles
    ALTER COLUMN avatar_url TYPE VARCHAR(500)
  `);

  // Revert banner_url to varchar(500)
  await knex.raw(`
    ALTER TABLE user_profiles
    ALTER COLUMN banner_url TYPE VARCHAR(500)
  `);
}
