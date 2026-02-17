import type { Knex } from 'knex';

/**
 * Migration: Create channel_categories table
 *
 * Categories organize channels within servers.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('channel_categories', (table) => {
    // Primary key - Snowflake ID
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Server reference
    table
      .string('server_id', 20)
      .notNullable()
      .comment('Server ID this category belongs to')
      .references('id')
      .inTable('servers')
      .onDelete('CASCADE');

    // Category information
    table.string('name', 100).notNullable().comment('Category name');
    table.integer('position').notNullable().defaultTo(0).comment('Display position within server');
    table.boolean('nsfw').notNullable().defaultTo(false).comment('Whether category is NSFW');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('server_id', 'idx_channel_categories_server_id');
    table.index(['server_id', 'position'], 'idx_channel_categories_server_position');

    // Constraints
    table.check('char_length(name) >= 1 AND char_length(name) <= 100', [], 'chk_category_name_length');
    table.check('position >= 0', [], 'chk_category_position');
  });

  await knex.raw(`COMMENT ON TABLE channel_categories IS 'Channel categories for organizing channels within servers'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('channel_categories');
}
