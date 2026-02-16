export async function up(knex) {
    await knex.schema.createTable('reactions', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table
            .string('message_id', 20)
            .notNullable()
            .comment('ID of the message being reacted to')
            .references('id')
            .inTable('messages')
            .onDelete('CASCADE');
        table
            .string('user_id', 20)
            .notNullable()
            .comment('ID of the user who reacted')
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table
            .string('emoji_type', 10)
            .notNullable()
            .comment("Type of emoji: 'unicode' or 'custom'");
        table
            .string('emoji_id', 20)
            .nullable()
            .comment('ID of custom emoji (nullable, used when emoji_type is custom)');
        table
            .string('emoji_unicode', 20)
            .nullable()
            .comment('Unicode representation of emoji (nullable, used when emoji_type is unicode)');
        table
            .timestamp('created_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When the reaction was added');
        table.index('message_id', 'idx_reactions_message_id');
        table.index('user_id', 'idx_reactions_user_id');
        table.index(['message_id', 'emoji_type'], 'idx_reactions_message_emoji_type');
        table.check("emoji_type IN ('unicode', 'custom')", [], 'chk_reaction_emoji_type');
        table.check('(emoji_id IS NOT NULL AND emoji_unicode IS NULL) OR (emoji_id IS NULL AND emoji_unicode IS NOT NULL)', [], 'chk_reaction_emoji_xor');
        table.comment('Stores message reactions with unicode and custom emoji support');
    });
    await knex.raw(`COMMENT ON TABLE reactions IS 'Message reactions with support for unicode and custom emojis'`);
    await knex.raw(`
    CREATE UNIQUE INDEX idx_reactions_unique
    ON reactions (message_id, user_id, emoji_type, COALESCE(emoji_id, emoji_unicode))
  `);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('reactions');
}
//# sourceMappingURL=20260216202532_create_reactions_table.js.map