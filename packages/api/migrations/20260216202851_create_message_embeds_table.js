export async function up(knex) {
    await knex.schema.createTable('message_embeds', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table
            .string('message_id', 20)
            .notNullable()
            .comment('ID of the message this embed belongs to')
            .references('id')
            .inTable('messages')
            .onDelete('CASCADE');
        table
            .string('type', 20)
            .notNullable()
            .defaultTo('rich')
            .comment("Embed type: 'rich', 'image', 'video', 'link', 'article'");
        table.string('title', 256).nullable().comment('Embed title (max 256 characters)');
        table.text('description').nullable().comment('Embed description (max 4096 characters)');
        table.string('url', 2048).nullable().comment('Embed URL');
        table.timestamp('timestamp', { useTz: true }).nullable().comment('Embed timestamp (for articles)');
        table.integer('color').nullable().comment('Embed color (decimal color code)');
        table.string('footer_text', 2048).nullable().comment('Footer text (max 2048 characters)');
        table.string('footer_icon_url', 500).nullable().comment('Footer icon URL');
        table.string('image_url', 500).nullable().comment('Main image URL');
        table.string('thumbnail_url', 500).nullable().comment('Thumbnail image URL');
        table.string('author_name', 256).nullable().comment('Author name (max 256 characters)');
        table.string('author_url', 500).nullable().comment('Author URL');
        table.string('author_icon_url', 500).nullable().comment('Author icon URL');
        table
            .jsonb('fields')
            .nullable()
            .comment('Embed fields as JSONB array [{name, value, inline}]');
        table
            .timestamp('created_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When the embed was created');
        table.index('message_id', 'idx_message_embeds_message_id');
        table.index('type', 'idx_message_embeds_type');
        table.index('created_at', 'idx_message_embeds_created_at');
        table.check("type IN ('rich', 'image', 'video', 'link', 'article')", [], 'chk_embed_type');
        table.check('title IS NULL OR char_length(title) <= 256', [], 'chk_embed_title_length');
        table.check('description IS NULL OR char_length(description) <= 4096', [], 'chk_embed_description_length');
        table.check('footer_text IS NULL OR char_length(footer_text) <= 2048', [], 'chk_embed_footer_length');
        table.check('author_name IS NULL OR char_length(author_name) <= 256', [], 'chk_embed_author_name_length');
        table.comment('Stores rich embeds attached to messages');
    });
    await knex.raw(`COMMENT ON TABLE message_embeds IS 'Rich embeds attached to messages with support for various embed types'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('message_embeds');
}
//# sourceMappingURL=20260216202851_create_message_embeds_table.js.map