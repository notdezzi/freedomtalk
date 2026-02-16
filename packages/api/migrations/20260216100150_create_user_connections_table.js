export async function up(knex) {
    await knex.schema.createTable('user_connections', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table.string('user_id', 20).notNullable().comment('Reference to users.id (initiator)');
        table.string('connected_user_id', 20).notNullable().comment('Reference to users.id (target)');
        table.string('connection_type', 30).notNullable().comment('Type: friend, blocked, pending_incoming, pending_outgoing');
        table.string('status', 20).defaultTo('active').notNullable().comment('Status: active, inactive');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.foreign('connected_user_id').references('id').inTable('users').onDelete('CASCADE');
        table.unique(['user_id', 'connected_user_id'], { indexName: 'idx_user_connections_unique' });
        table.index('user_id', 'idx_user_connections_user_id');
        table.index('connected_user_id', 'idx_user_connections_connected_user_id');
        table.index('connection_type', 'idx_user_connections_type');
        table.index(['user_id', 'connection_type'], 'idx_user_connections_user_type');
        table.check('user_id != connected_user_id', [], 'chk_no_self_connection');
        table.check("connection_type IN ('friend', 'blocked', 'pending_incoming', 'pending_outgoing')", [], 'chk_connection_type');
        table.check("status IN ('active', 'inactive')", [], 'chk_status');
    });
    await knex.raw(`COMMENT ON TABLE user_connections IS 'User relationships: friends, blocks, and pending requests'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('user_connections');
}
//# sourceMappingURL=20260216100150_create_user_connections_table.js.map