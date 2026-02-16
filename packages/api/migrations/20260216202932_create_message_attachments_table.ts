import type { Knex } from 'knex';

/**
 * Migration: Create message_attachments table
 *
 * This table stores file attachments for messages including:
 * - Images (with dimensions and thumbnails)
 * - Videos (with dimensions)
 * - Audio files
 * - Documents
 * - Other file types
 *
 * Files are stored in MinIO object storage, this table stores metadata.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('message_attachments', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Message reference
    table
      .string('message_id', 20)
      .notNullable()
      .comment('ID of the message this attachment belongs to')
      .references('id')
      .inTable('messages')
      .onDelete('CASCADE');

    // File metadata
    table.string('filename', 255).notNullable().comment('Original filename');
    table.bigInteger('size').notNullable().comment('File size in bytes');
    table.string('mime_type', 100).notNullable().comment('MIME type of the file');
    table.string('object_path', 500).notNullable().comment('Path to file in MinIO object storage');

    // Image/Video dimensions (nullable for non-media files)
    table.integer('width').nullable().comment('Width in pixels (for images/videos)');
    table.integer('height').nullable().comment('Height in pixels (for images/videos)');

    // Thumbnail (for images and videos)
    table.string('thumbnail_path', 500).nullable().comment('Path to thumbnail in MinIO');

    // Uploader reference
    table
      .string('uploaded_by', 20)
      .notNullable()
      .comment('User ID who uploaded the file')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    // Timestamp
    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('When the attachment was uploaded');

    // Indexes for common query patterns
    table.index('message_id', 'idx_message_attachments_message_id');
    table.index('uploaded_by', 'idx_message_attachments_uploaded_by');
    table.index('mime_type', 'idx_message_attachments_mime_type');
    table.index('created_at', 'idx_message_attachments_created_at');

    // Check constraints
    table.check('size > 0', [], 'chk_attachment_size_positive');
    table.check(
      '(width IS NULL OR width > 0)',
      [],
      'chk_attachment_width_positive'
    );
    table.check(
      '(height IS NULL OR height > 0)',
      [],
      'chk_attachment_height_positive'
    );

    // Table comment
    table.comment('Stores file attachment metadata for messages');
  });

  // Add table comment
  await knex.raw(
    `COMMENT ON TABLE message_attachments IS 'File attachment metadata for messages (files stored in MinIO)'`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('message_attachments');
}

