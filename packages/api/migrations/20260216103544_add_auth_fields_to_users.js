export async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.string('verification_token', 255).nullable().comment('Email verification token');
        table.timestamp('verification_token_expires', { useTz: true }).nullable().comment('Email verification token expiration');
        table.jsonb('mfa_backup_codes').nullable().comment('MFA backup codes (hashed)');
    });
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('verification_token');
        table.dropColumn('verification_token_expires');
        table.dropColumn('mfa_backup_codes');
    });
}
//# sourceMappingURL=20260216103544_add_auth_fields_to_users.js.map