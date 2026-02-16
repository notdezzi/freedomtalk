import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Email verification fields
    table.string('verification_token', 255).nullable().comment('Email verification token');
    table.timestamp('verification_token_expires', { useTz: true }).nullable().comment('Email verification token expiration');

    // MFA backup codes (stored as JSON array of hashed codes)
    table.jsonb('mfa_backup_codes').nullable().comment('MFA backup codes (hashed)');
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('verification_token');
    table.dropColumn('verification_token_expires');
    table.dropColumn('mfa_backup_codes');
  });
}

