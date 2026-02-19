import type { Knex } from 'knex';

/**
 * Migration: Add three-state permissions to roles table
 *
 * Replaces the single `permissions` column with `allow_permissions` and
 * `deny_permissions` columns for a three-state permission model:
 * - allow_permissions: Permissions explicitly granted
 * - deny_permissions: Permissions explicitly denied
 * - (neutral): Permissions not in allow or deny inherit from role hierarchy
 *
 * This matches the pattern used in permission_overwrites table.
 */
export async function up(knex: Knex): Promise<void> {
  // Step 1: Add new columns
  await knex.schema.alterTable('roles', (table) => {
    table
      .bigInteger('allow_permissions')
      .notNullable()
      .defaultTo(0)
      .comment('Permissions explicitly allowed (bitwise)');
    table
      .bigInteger('deny_permissions')
      .notNullable()
      .defaultTo(0)
      .comment('Permissions explicitly denied (bitwise)');
  });

  // Step 2: Migrate existing permissions to allow_permissions
  // All existing permissions are treated as "allowed"
  await knex.raw(`
    UPDATE roles
    SET allow_permissions = permissions
  `);

  // Step 3: Drop the old permissions column
  await knex.schema.alterTable('roles', (table) => {
    table.dropColumn('permissions');
  });

  // Step 4: Add comments for documentation
  await knex.raw(`
    COMMENT ON COLUMN roles.allow_permissions IS 'Bitwise flags for explicitly allowed permissions'
  `);
  await knex.raw(`
    COMMENT ON COLUMN roles.deny_permissions IS 'Bitwise flags for explicitly denied permissions'
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Step 1: Add back the permissions column
  await knex.schema.alterTable('roles', (table) => {
    table
      .bigInteger('permissions')
      .notNullable()
      .defaultTo(0)
      .comment('Bitwise permission flags');
  });

  // Step 2: Restore permissions from allow_permissions
  // Note: This is a lossy conversion - deny_permissions info is lost
  await knex.raw(`
    UPDATE roles
    SET permissions = allow_permissions
  `);

  // Step 3: Drop the new columns
  await knex.schema.alterTable('roles', (table) => {
    table.dropColumn('allow_permissions');
    table.dropColumn('deny_permissions');
  });

  // Step 4: Restore comment
  await knex.raw(`
    COMMENT ON COLUMN roles.permissions IS 'Bitwise permission flags'
  `);
}
