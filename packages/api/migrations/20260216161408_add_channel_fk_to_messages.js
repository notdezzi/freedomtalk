export async function up(knex) {
    await knex.schema.alterTable('messages', (table) => {
        table
            .foreign('channel_id')
            .references('id')
            .inTable('channels')
            .onDelete('SET NULL')
            .onUpdate('CASCADE');
    });
}
export async function down(knex) {
    await knex.schema.alterTable('messages', (table) => {
        table.dropForeign(['channel_id']);
    });
}
//# sourceMappingURL=20260216161408_add_channel_fk_to_messages.js.map