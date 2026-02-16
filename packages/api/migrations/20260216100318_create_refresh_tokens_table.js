export async function up(knex) {
    await knex.schema.createTable('refresh_tokens', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table.string('token_hash', 255).unique().notNullable().comment('Hashed refresh token');
        table.string('user_id', 20).notNullable().comment('Reference to users.id');
        table.string('device_fingerprint', 255).nullable().comment('Device fingerprint for token binding');
        table.boolean('is_revoked').defaultTo(false).notNullable().comment('Whether token has been revoked');
        table.timestamp('revoked_at', { useTz: true }).nullable().comment('When token was revoked');
        table.string('revoked_reason', 100).nullable().comment('Reason for revocation');
        table.timestamp('expires_at', { useTz: true }).notNullable().comment('Token expiration timestamp');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.index('token_hash', 'idx_refresh_tokens_hash');
        table.index('user_id', 'idx_refresh_tokens_user_id');
        table.index('expires_at', 'idx_refresh_tokens_expires_at');
        table.index('is_revoked', 'idx_refresh_tokens_revoked');
        table.index(['user_id', 'is_revoked'], 'idx_refresh_tokens_user_revoked');
    });
    await knex.raw(`COMMENT ON TABLE refresh_tokens IS 'Refresh tokens for JWT authentication'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('refresh_tokens');
}
//# sourceMappingURL=20260216100318_create_refresh_tokens_table.js.map