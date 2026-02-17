export async function up(knex) {
    await knex.schema.createTable('server_members', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
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
        table.string('nickname', 32).nullable().comment('Server-specific nickname');
        table.string('avatar_url', 500).nullable().comment('Server-specific avatar');
        table.boolean('mute').notNullable().defaultTo(false).comment('Whether user is muted in the server');
        table.boolean('deaf').notNullable().defaultTo(false).comment('Whether user is deafened in the server');
        table.boolean('pending').notNullable().defaultTo(false).comment('Whether membership is pending (verification required)');
        table.timestamp('joined_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('When user joined the server');
        table.timestamp('boosted_since', { useTz: true }).nullable().comment('When user started boosting the server');
        table.text('communication_disabled_until').nullable().comment('ISO timestamp for timeout expiration');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.index('server_id', 'idx_server_members_server_id');
        table.index('user_id', 'idx_server_members_user_id');
        table.index(['server_id', 'user_id'], 'idx_server_members_server_user');
        table.unique(['server_id', 'user_id'], 'unq_server_members_server_user');
    });
    await knex.raw(`COMMENT ON TABLE server_members IS 'Server membership and member settings'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('server_members');
}
//# sourceMappingURL=20260217100001_create_server_members_table.js.map