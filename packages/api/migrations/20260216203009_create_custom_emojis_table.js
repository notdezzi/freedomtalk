export async function up(knex) {
    await knex.schema.createTable('custom_emojis', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table
            .string('server_id', 20)
            .notNullable()
            .comment('ID of the server this emoji belongs to')
            .references('id')
            .inTable('servers')
            .onDelete('CASCADE');
        table
            .string('name', 32)
            .notNullable()
            .comment('Emoji name (2-32 characters, alphanumeric and underscores only)');
        table.string('image_url', 500).notNullable().comment('URL to emoji image in MinIO');
        table.boolean('animated').defaultTo(false).notNullable().comment('Whether emoji is animated (GIF)');
        table
            .string('created_by', 20)
            .notNullable()
            .comment('User ID who created the emoji')
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table
            .timestamp('created_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When the emoji was created');
        table
            .timestamp('updated_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When the emoji was last updated');
        table.index('server_id', 'idx_custom_emojis_server_id');
        table.index('name', 'idx_custom_emojis_name');
        table.index('created_by', 'idx_custom_emojis_created_by');
        table.index('created_at', 'idx_custom_emojis_created_at');
        table.unique(['server_id', 'name'], { indexName: 'idx_custom_emojis_server_name_unique' });
        table.check("name ~ '^[a-zA-Z0-9_]+$'", [], 'chk_custom_emoji_name_format');
        table.check('char_length(name) >= 2 AND char_length(name) <= 32', [], 'chk_custom_emoji_name_length');
        table.comment('Stores server-specific custom emojis');
    });
    await knex.raw(`COMMENT ON TABLE custom_emojis IS 'Server-specific custom emojis for messages and reactions'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('custom_emojis');
}
//# sourceMappingURL=20260216203009_create_custom_emojis_table.js.map