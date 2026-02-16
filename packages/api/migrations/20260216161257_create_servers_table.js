export async function up(knex) {
    await knex.schema.createTable('servers', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table.string('name', 100).notNullable().comment('Server name (1-100 characters)');
        table.text('description').nullable().comment('Server description (optional)');
        table
            .string('owner_id', 20)
            .notNullable()
            .comment('User ID of server owner')
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table.string('icon_url', 500).nullable().comment('Server icon URL');
        table.string('banner_url', 500).nullable().comment('Server banner URL');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Creation timestamp');
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Last update timestamp');
        table.index('owner_id', 'idx_servers_owner_id');
        table.index('name', 'idx_servers_name');
        table.index('created_at', 'idx_servers_created_at');
        table.check('char_length(name) >= 1 AND char_length(name) <= 100', [], 'chk_server_name_length');
        table.comment('Stores server/guild information for organizing channels and users');
    });
    await knex.raw(`COMMENT ON TABLE servers IS 'Server/guild information for organizing channels and users'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('servers');
}
//# sourceMappingURL=20260216161257_create_servers_table.js.map