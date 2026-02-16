export async function up(knex) {
    await knex.schema.createTable('password_resets', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table.string('token_hash', 255).unique().notNullable().comment('Hashed reset token');
        table.string('user_id', 20).notNullable().comment('Reference to users.id');
        table.boolean('is_used').defaultTo(false).notNullable().comment('Whether token has been used');
        table.timestamp('used_at', { useTz: true }).nullable().comment('When token was used');
        table.timestamp('expires_at', { useTz: true }).notNullable().comment('Token expiration timestamp');
        table.string('ip_address', 45).nullable().comment('IP address that requested reset');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.index('token_hash', 'idx_password_resets_hash');
        table.index('user_id', 'idx_password_resets_user_id');
        table.index('expires_at', 'idx_password_resets_expires_at');
        table.index('is_used', 'idx_password_resets_used');
        table.index(['user_id', 'is_used', 'expires_at'], 'idx_password_resets_validation');
    });
    await knex.raw(`COMMENT ON TABLE password_resets IS 'Password reset tokens for account recovery'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('password_resets');
}
//# sourceMappingURL=20260216100401_create_password_resets_table.js.map