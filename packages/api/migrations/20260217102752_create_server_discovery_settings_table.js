export async function up(knex) {
    await knex.schema.createTable('server_discovery_settings', (table) => {
        table
            .string('server_id', 20)
            .primary()
            .notNullable()
            .comment('Server ID (references servers.id)')
            .references('id')
            .inTable('servers')
            .onDelete('CASCADE');
        table
            .boolean('is_discoverable')
            .defaultTo(false)
            .notNullable()
            .comment('Whether server appears in discovery directory');
        table
            .string('category', 50)
            .nullable()
            .comment('Server category for filtering (gaming, music, etc.)');
        table
            .specificType('tags', 'TEXT[]')
            .nullable()
            .comment('Array of tags for server discovery');
        table
            .text('discovery_description')
            .nullable()
            .comment('Custom description shown in discovery directory');
        table
            .timestamp('updated_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('Last update timestamp');
        table.index('is_discoverable', 'idx_discovery_settings_discoverable');
        table.index('category', 'idx_discovery_settings_category');
        table.comment('Stores server discovery/directory settings');
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('server_discovery_settings');
}
//# sourceMappingURL=20260217102752_create_server_discovery_settings_table.js.map