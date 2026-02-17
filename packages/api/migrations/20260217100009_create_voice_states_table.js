export async function up(knex) {
    await knex.schema.createTable('voice_states', (table) => {
        table.string('id', 20).primary();
        table.string('channel_id', 20).notNullable().references('id').inTable('channels').onDelete('CASCADE');
        table.string('user_id', 20).notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('server_id', 20).notNullable().references('id').inTable('servers').onDelete('CASCADE');
        table.string('session_id', 50).notNullable();
        table.boolean('self_mute').defaultTo(false);
        table.boolean('self_deaf').defaultTo(false);
        table.boolean('self_video').defaultTo(false);
        table.boolean('self_stream').defaultTo(false);
        table.boolean('suppress').defaultTo(false);
        table.timestamp('request_to_speak_timestamp').nullable();
        table.timestamp('joined_at').defaultTo(knex.fn.now());
        table.unique(['channel_id', 'user_id']);
        table.unique(['session_id']);
        table.index('channel_id');
        table.index('user_id');
        table.index('server_id');
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('voice_states');
}
//# sourceMappingURL=20260217100009_create_voice_states_table.js.map