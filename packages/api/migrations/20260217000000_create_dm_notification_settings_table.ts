import type { Knex } from 'knex';

/**
 * Migration: Create dm_notification_settings table
 *
 * Stores notification preferences for DM channels
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dm_notification_settings', (table) => {
    // Primary key - Snowflake ID (20-character string)
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // User reference
    table
      .string('user_id', 20)
      .notNullable()
      .comment('User ID')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // DM Channel reference
    table
      .string('dm_channel_id', 20)
      .notNullable()
      .comment('DM Channel ID')
      .references('id')
      .inTable('dm_channels')
      .onDelete('CASCADE');

    // Notification settings
    table.boolean('is_muted').defaultTo(false).notNullable().comment('Whether DM is muted');
    table.timestamp('mute_until', { useTz: true }).nullable().comment('When mute expires (null = indefinite)');
    table
      .enum('notification_level', ['all', 'mentions', 'none'])
      .defaultTo('all')
      .notNullable()
      .comment('Notification level');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('user_id', 'idx_dm_notification_settings_user_id');
    table.index('dm_channel_id', 'idx_dm_notification_settings_dm_channel_id');
    table.unique(['user_id', 'dm_channel_id'], 'idx_dm_notification_settings_user_dm_unique');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dm_notification_settings');
}
