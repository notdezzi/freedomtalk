import type { Knex } from 'knex';

/**
 * Migration: Create voice_states table
 * Tracks users currently in voice channels
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('voice_states', (table) => {
    table.string('id', 20).primary();

    // References
    table.string('channel_id', 20).notNullable().references('id').inTable('channels').onDelete('CASCADE');
    table.string('user_id', 20).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('server_id', 20).notNullable().references('id').inTable('servers').onDelete('CASCADE');

    // Session
    table.string('session_id', 50).notNullable();

    // State
    table.boolean('self_mute').defaultTo(false);
    table.boolean('self_deaf').defaultTo(false);
    table.boolean('self_video').defaultTo(false);
    table.boolean('self_stream').defaultTo(false);
    table.boolean('suppress').defaultTo(false); // Server mute

    // For stage channels (future)
    table.timestamp('request_to_speak_timestamp').nullable();

    // Timestamps
    table.timestamp('joined_at').defaultTo(knex.fn.now());

    // Unique constraints
    table.unique(['channel_id', 'user_id']);
    table.unique(['session_id']);

    // Indexes
    table.index('channel_id');
    table.index('user_id');
    table.index('server_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('voice_states');
}
