export async function up(knex) {
    await knex.schema.createTable('dm_channels', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table
            .string('type', 10)
            .notNullable()
            .comment("DM type: 'dm' (1-on-1) or 'group_dm' (2-10 participants)");
        table
            .string('name', 100)
            .nullable()
            .comment('Group DM name (nullable for 1-on-1 DMs, required for group DMs)');
        table.string('icon_url', 500).nullable().comment('Group DM icon URL (optional)');
        table
            .string('owner_id', 20)
            .nullable()
            .comment('User ID of group DM owner (nullable for 1-on-1 DMs)')
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table
            .timestamp('created_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When the DM channel was created');
        table
            .timestamp('updated_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When the DM channel was last updated');
        table.index('type', 'idx_dm_channels_type');
        table.index('owner_id', 'idx_dm_channels_owner_id');
        table.index('created_at', 'idx_dm_channels_created_at');
        table.check("type IN ('dm', 'group_dm')", [], 'chk_dm_channel_type');
        table.check("type = 'dm' OR (type = 'group_dm' AND owner_id IS NOT NULL)", [], 'chk_dm_channel_group_has_owner');
        table.check('name IS NULL OR (char_length(name) >= 1 AND char_length(name) <= 100)', [], 'chk_dm_channel_name_length');
        table.comment('Stores DM and Group DM channels');
    });
    await knex.raw(`COMMENT ON TABLE dm_channels IS 'Direct message channels (1-on-1 and group DMs)'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('dm_channels');
}
//# sourceMappingURL=20260216203046_create_dm_channels_table.js.map