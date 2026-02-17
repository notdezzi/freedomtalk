import type { Knex } from 'knex';

/**
 * Migration: Create member_roles junction table
 *
 * Many-to-many relationship between members and roles.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('member_roles', (table) => {
    // Composite primary key
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
      .comment('User ID')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .string('role_id', 20)
      .notNullable()
      .comment('Role ID')
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE');

    // Timestamps
    table.timestamp('assigned_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Primary key constraint
    table.primary(['server_id', 'user_id', 'role_id'], 'pk_member_roles');

    // Indexes
    table.index(['server_id', 'user_id'], 'idx_member_roles_server_user');
    table.index('role_id', 'idx_member_roles_role_id');
  });

  await knex.raw(`COMMENT ON TABLE member_roles IS 'Junction table for member-role assignments'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('member_roles');
}
