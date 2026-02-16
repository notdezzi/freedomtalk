export async function up(knex) {
    await knex.schema.createTable('users', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table.string('email', 255).unique().notNullable().comment('User email address');
        table.string('username', 32).unique().notNullable().comment('Unique username (3-32 chars)');
        table.string('password_hash', 255).notNullable().comment('Bcrypt password hash');
        table.boolean('email_verified').defaultTo(false).notNullable().comment('Email verification status');
        table.boolean('mfa_enabled').defaultTo(false).notNullable().comment('MFA enabled status');
        table.string('mfa_secret', 255).nullable().comment('TOTP secret for MFA');
        table.string('account_status', 20).defaultTo('active').notNullable().comment('Account status: active, suspended, deleted');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.index('email', 'idx_users_email');
        table.index('username', 'idx_users_username');
        table.index('created_at', 'idx_users_created_at');
        table.index('account_status', 'idx_users_account_status');
        table.check('char_length(username) >= 3 AND char_length(username) <= 32', [], 'chk_username_length');
        table.check("account_status IN ('active', 'suspended', 'deleted')", [], 'chk_account_status');
    });
    await knex.raw(`COMMENT ON TABLE users IS 'Core user authentication and account information'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('users');
}
//# sourceMappingURL=20260216095855_create_users_table.js.map