export async function up(knex) {
    await knex.schema.createTable('roles', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table
            .string('server_id', 20)
            .notNullable()
            .comment('Server ID this role belongs to')
            .references('id')
            .inTable('servers')
            .onDelete('CASCADE');
        table.string('name', 100).notNullable().comment('Role name (1-100 characters)');
        table.integer('color').notNullable().defaultTo(0).comment('Role color as integer (0 = default)');
        table.boolean('hoist').notNullable().defaultTo(false).comment('Whether to show members separately in sidebar');
        table.string('icon', 50).nullable().comment('Role icon (emoji or unicode)');
        table.integer('position').notNullable().defaultTo(0).comment('Position in role hierarchy (higher = more authority)');
        table.bigInteger('permissions').notNullable().defaultTo(0).comment('Bitwise permission flags');
        table.boolean('managed').notNullable().defaultTo(false).comment('Whether role is managed by integration/bot');
        table.boolean('mentionable').notNullable().defaultTo(true).comment('Whether role can be mentioned');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.index('server_id', 'idx_roles_server_id');
        table.index(['server_id', 'position'], 'idx_roles_server_position');
        table.index('name', 'idx_roles_name');
        table.check('char_length(name) >= 1 AND char_length(name) <= 100', [], 'chk_role_name_length');
        table.check('color >= 0 AND color <= 16777215', [], 'chk_role_color_range');
        table.check('position >= 0', [], 'chk_role_position');
    });
    await knex.raw(`COMMENT ON TABLE roles IS 'Server roles with bitwise permissions'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('roles');
}
//# sourceMappingURL=20260217100000_create_roles_table.js.map