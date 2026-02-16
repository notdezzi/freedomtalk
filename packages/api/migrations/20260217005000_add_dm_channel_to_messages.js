export async function up(knex) {
    await knex.schema.alterTable('messages', (table) => {
        table
            .string('dm_channel_id', 20)
            .nullable()
            .references('id')
            .inTable('dm_channels')
            .onDelete('CASCADE')
            .comment('DM Channel ID for direct messages (null for channel messages)');
        table.index('dm_channel_id', 'idx_messages_dm_channel_id');
    });
}
export async function down(knex) {
    await knex.schema.alterTable('messages', (table) => {
        table.dropIndex('dm_channel_id', 'idx_messages_dm_channel_id');
        table.dropColumn('dm_channel_id');
    });
}
//# sourceMappingURL=20260217005000_add_dm_channel_to_messages.js.map