export async function up(knex) {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;');
    await knex.schema.createTable('message_history', (table) => {
        table.string('id', 20).notNullable().comment('Snowflake ID');
        table
            .string('message_id', 20)
            .notNullable()
            .comment('ID of the message that was edited')
            .references('id')
            .inTable('messages')
            .onDelete('CASCADE');
        table.text('content').notNullable().comment('Previous message content before edit');
        table
            .string('edited_by', 20)
            .notNullable()
            .comment('User ID who made the edit')
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table.timestamp('edited_at', { useTz: true }).notNullable().comment('When the edit occurred');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Record creation timestamp');
        table.index('id', 'idx_message_history_id');
        table.index('message_id', 'idx_message_history_message_id');
        table.index('edited_at', 'idx_message_history_edited_at');
        table.comment('Tracks message edit history with TimescaleDB hypertable optimization');
    });
    await knex.raw(`
    SELECT create_hypertable(
      'message_history',
      'edited_at',
      if_not_exists => TRUE
    );
  `);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('message_history');
}
//# sourceMappingURL=20260216133509_create_message_history_table.js.map