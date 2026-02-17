import type { Knex } from 'knex';

/**
 * Add onboarding field to user_profiles table
 *
 * This adds a field to track onboarding completion status
 * so it persists across sessions/devices.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_profiles', (table) => {
    // Track onboarding completion
    table.timestamp('onboarding_completed_at', { useTz: true })
      .nullable()
      .comment('When the user completed onboarding');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_profiles', (table) => {
    table.dropColumn('onboarding_completed_at');
  });
}
