export async function up(knex) {
    await knex.schema.createTable('search_analytics', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
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
        table
            .string('user_id', 20)
            .nullable()
            .comment('User ID who performed search')
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table
            .timestamp('created_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When search was performed');
        table.index('search_type', 'idx_search_analytics_type');
        table.index('created_at', 'idx_search_analytics_created');
        table.index(['search_type', 'created_at'], 'idx_search_analytics_type_date');
        table.comment('Stores search analytics for tracking and optimization');
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('search_analytics');
}
//# sourceMappingURL=20260217102829_create_search_analytics_table.js.map