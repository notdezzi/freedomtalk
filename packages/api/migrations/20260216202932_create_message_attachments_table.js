export async function up(knex) {
    await knex.schema.createTable('message_attachments', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table
            .string('message_id', 20)
            .notNullable()
            .comment('ID of the message this attachment belongs to')
            .references('id')
            .inTable('messages')
            .onDelete('CASCADE');
        table.string('filename', 255).notNullable().comment('Original filename');
        table.bigInteger('size').notNullable().comment('File size in bytes');
        table.string('mime_type', 100).notNullable().comment('MIME type of the file');
        table.string('object_path', 500).notNullable().comment('Path to file in MinIO object storage');
        table.integer('width').nullable().comment('Width in pixels (for images/videos)');
        table.integer('height').nullable().comment('Height in pixels (for images/videos)');
        table.string('thumbnail_path', 500).nullable().comment('Path to thumbnail in MinIO');
        table
            .string('uploaded_by', 20)
            .notNullable()
            .comment('User ID who uploaded the file')
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table
            .timestamp('created_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When the attachment was uploaded');
        table.index('message_id', 'idx_message_attachments_message_id');
        table.index('uploaded_by', 'idx_message_attachments_uploaded_by');
        table.index('mime_type', 'idx_message_attachments_mime_type');
        table.index('created_at', 'idx_message_attachments_created_at');
        table.check('size > 0', [], 'chk_attachment_size_positive');
        table.check('(width IS NULL OR width > 0)', [], 'chk_attachment_width_positive');
        table.check('(height IS NULL OR height > 0)', [], 'chk_attachment_height_positive');
        table.comment('Stores file attachment metadata for messages');
    });
    await knex.raw(`COMMENT ON TABLE message_attachments IS 'File attachment metadata for messages (files stored in MinIO)'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('message_attachments');
}
//# sourceMappingURL=20260216202932_create_message_attachments_table.js.map