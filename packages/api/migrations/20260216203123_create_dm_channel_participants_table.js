export async function up(knex) {
    await knex.schema.createTable('dm_channel_participants', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table
            .string('dm_channel_id', 20)
            .notNullable()
            .comment('ID of the DM channel')
            .references('id')
            .inTable('dm_channels')
            .onDelete('CASCADE');
        table
            .string('user_id', 20)
            .notNullable()
            .comment('ID of the participant user')
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table
            .timestamp('joined_at', { useTz: true })
            .defaultTo(knex.fn.now())
            .notNullable()
            .comment('When the user joined the DM channel');
        table
            .timestamp('left_at', { useTz: true })
            .nullable()
            .comment('When the user left the DM channel (null if still active)');
        table
            .boolean('is_active')
            .defaultTo(true)
            .notNullable()
            .comment('Whether the user is currently an active participant');
        table.index('dm_channel_id', 'idx_dm_participants_channel_id');
        table.index('user_id', 'idx_dm_participants_user_id');
        table.index(['dm_channel_id', 'user_id'], 'idx_dm_participants_channel_user');
        table.index('is_active', 'idx_dm_participants_active');
        table.index(['user_id', 'is_active'], 'idx_dm_participants_user_active');
        table.comment('Tracks participants in DM channels');
    });
    await knex.raw(`COMMENT ON TABLE dm_channel_participants IS 'Participants in DM and Group DM channels'`);
    await knex.raw(`
    CREATE UNIQUE INDEX idx_dm_participants_active_unique 
    ON dm_channel_participants (dm_channel_id, user_id) 
    WHERE is_active = true
  `);
}
export async function down(knex) {
    await knex.raw('DROP INDEX IF EXISTS idx_dm_participants_active_unique');
    await knex.schema.dropTableIfExists('dm_channel_participants');
}
//# sourceMappingURL=20260216203123_create_dm_channel_participants_table.js.map