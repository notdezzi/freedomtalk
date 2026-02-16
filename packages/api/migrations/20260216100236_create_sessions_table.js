export async function up(knex) {
    await knex.schema.createTable('sessions', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table.string('session_token', 255).unique().notNullable().comment('Unique session token');
        table.string('user_id', 20).notNullable().comment('Reference to users.id');
        table.string('device_name', 100).nullable().comment('Device name (e.g., "iPhone 13")');
        table.string('device_type', 50).nullable().comment('Device type (e.g., "mobile", "desktop")');
        table.string('ip_address', 45).nullable().comment('IP address (supports IPv6)');
        table.text('user_agent').nullable().comment('Browser/client user agent string');
        table.timestamp('expires_at', { useTz: true }).notNullable().comment('Session expiration timestamp');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.index('session_token', 'idx_sessions_token');
        table.index('user_id', 'idx_sessions_user_id');
        table.index('expires_at', 'idx_sessions_expires_at');
        table.index(['user_id', 'expires_at'], 'idx_sessions_user_expires');
    });
    await knex.raw(`COMMENT ON TABLE sessions IS 'Active user sessions for authentication'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('sessions');
}
//# sourceMappingURL=20260216100236_create_sessions_table.js.map