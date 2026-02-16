export async function up(knex) {
    await knex.schema.createTable('messages', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table.text('content').notNullable().comment('Message content (max 2000 characters)');
        table
            .string('author_id', 20)
            .notNullable()
            .comment('User ID of message author')
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table.string('channel_id', 20).nullable().comment('Channel ID (nullable for DM messages)');
        table.boolean('is_edited').defaultTo(false).notNullable().comment('Whether message has been edited');
        table.timestamp('edited_at', { useTz: true }).nullable().comment('When message was last edited');
        table.boolean('is_deleted').defaultTo(false).notNullable().comment('Soft delete flag');
        table.timestamp('deleted_at', { useTz: true }).nullable().comment('When message was soft deleted');
        table.boolean('is_pinned').defaultTo(false).notNullable().comment('Whether message is pinned');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Creation timestamp');
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable().comment('Last update timestamp');
        table.index('author_id', 'idx_messages_author_id');
        table.index('channel_id', 'idx_messages_channel_id');
        table.index('created_at', 'idx_messages_created_at');
        table.index(['channel_id', 'created_at'], 'idx_messages_channel_created');
        table.index('is_deleted', 'idx_messages_deleted');
        table.comment('Stores all messages with soft delete and edit tracking');
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('messages');
}
//# sourceMappingURL=20260216133426_create_messages_table.js.map