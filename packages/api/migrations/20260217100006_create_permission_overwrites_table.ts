import type { Knex } from 'knex';

/**
 * Migration: Create permission_overwrites table
 *
 * Channel-specific permission overrides for roles and members.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('permission_overwrites', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Channel reference
    table
      .string('channel_id', 20)
      .notNullable()
      .comment('Channel ID')
      .references('id')
      .inTable('channels')
      .onDelete('CASCADE');

    // Target information
    table.string('target_id', 20).notNullable().comment('Role ID or User ID');
    table.enum('target_type', ['role', 'member']).notNullable().comment('Whether target is a role or member');

    // Permission bits
    table.bigInteger('allow').notNullable().defaultTo(0).comment('Permissions to allow (bitwise)');
    table.bigInteger('deny').notNullable().defaultTo(0).comment('Permissions to deny (bitwise)');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('channel_id', 'idx_permission_overwrites_channel_id');
    table.index(['channel_id', 'target_id'], 'idx_permission_overwrites_channel_target');

    // Unique constraint - one overwrite per target per channel
    table.unique(['channel_id', 'target_id'], 'unq_permission_overwrites_channel_target');
  });

  await knex.raw(`COMMENT ON TABLE permission_overwrites IS 'Channel-specific permission overrides'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('permission_overwrites');
}
