import type { Knex } from 'knex';

/**
 * Migration: Create invites table
 *
 * Server invite codes for joining servers.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invites', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // References
    table
      .string('server_id', 20)
      .notNullable()
      .comment('Server ID')
      .references('id')
      .inTable('servers')
      .onDelete('CASCADE');
    table
      .string('channel_id', 20)
      .notNullable()
      .comment('Channel ID where invite was created')
      .references('id')
      .inTable('channels')
      .onDelete('CASCADE');
    table
      .string('inviter_id', 20)
      .notNullable()
      .comment('User ID who created the invite')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Invite information
    table.string('code', 10).notNullable().unique().comment('Unique invite code');
    table.integer('max_uses').nullable().comment('Maximum number of uses (null = unlimited)');
    table.integer('uses').notNullable().defaultTo(0).comment('Current number of uses');
    table.integer('max_age').nullable().comment('Max age in seconds (null = never expire)');
    table.boolean('temporary').notNullable().defaultTo(false).comment('Whether membership is temporary');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('expires_at', { useTz: true }).nullable().comment('When invite expires');

    // Indexes
    table.index('server_id', 'idx_invites_server_id');
    table.index('channel_id', 'idx_invites_channel_id');
    table.index('inviter_id', 'idx_invites_inviter_id');
    table.index('code', 'idx_invites_code');
    table.index('expires_at', 'idx_invites_expires_at');

    // Constraints
    table.check('max_uses IS NULL OR max_uses >= 0', [], 'chk_invite_max_uses');
    table.check('uses >= 0', [], 'chk_invite_uses');
    table.check('max_age IS NULL OR max_age >= 0', [], 'chk_invite_max_age');
  });

  await knex.raw(`COMMENT ON TABLE invites IS 'Server invite codes'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invites');
}
