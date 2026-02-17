import type { Knex } from 'knex';

/**
 * Migration: Create search_analytics table
 *
 * Stores search analytics for tracking popular queries and improving search
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('search_analytics', (table) => {
    // Primary key - Snowflake ID (20-character string)
    table.string('id', 20).primary().notNullable().comment('Snowflake ID');

    // Search query data
    table.text('query').notNullable().comment('Search query text');

    table
      .string('search_type', 20)
      .notNullable()
      .comment('Type of search: message, user, server');

    table
      .integer('results_count')
      .notNullable()
      .defaultTo(0)
      .comment('Number of results returned');

    // User who performed search
    table
      .string('user_id', 20)
      .nullable()
      .comment('User ID who performed search')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    // Timestamps
    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('When search was performed');

    // Indexes for analytics queries
    table.index('search_type', 'idx_search_analytics_type');
    table.index('created_at', 'idx_search_analytics_created');
    table.index(['search_type', 'created_at'], 'idx_search_analytics_type_date');

    // Table comment
    table.comment('Stores search analytics for tracking and optimization');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('search_analytics');
}
