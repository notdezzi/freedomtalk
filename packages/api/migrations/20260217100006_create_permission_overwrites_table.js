export async function up(knex) {
    await knex.schema.createTable('permission_overwrites', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table
            .string('channel_id', 20)
            .notNullable()
            .comment('Channel ID')
            .references('id')
            .inTable('channels')
            .onDelete('CASCADE');
        table.string('target_id', 20).notNullable().comment('Role ID or User ID');
        table.enum('target_type', ['role', 'member']).notNullable().comment('Whether target is a role or member');
        table.bigInteger('allow').notNullable().defaultTo(0).comment('Permissions to allow (bitwise)');
        table.bigInteger('deny').notNullable().defaultTo(0).comment('Permissions to deny (bitwise)');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.index('channel_id', 'idx_permission_overwrites_channel_id');
        table.index(['channel_id', 'target_id'], 'idx_permission_overwrites_channel_target');
        table.unique(['channel_id', 'target_id'], 'unq_permission_overwrites_channel_target');
    });
    await knex.raw(`COMMENT ON TABLE permission_overwrites IS 'Channel-specific permission overrides'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('permission_overwrites');
}
//# sourceMappingURL=20260217100006_create_permission_overwrites_table.js.map