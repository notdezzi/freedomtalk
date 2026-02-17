export async function up(knex) {
    await knex.schema.alterTable('channels', (table) => {
        table
            .string('category_id', 20)
            .nullable()
            .comment('Category ID this channel belongs to')
            .references('id')
            .inTable('channel_categories')
            .onDelete('SET NULL');
        table.boolean('nsfw').notNullable().defaultTo(false).comment('Whether channel is NSFW');
        table.integer('rate_limit_per_user').notNullable().defaultTo(0).comment('Slow mode rate limit in seconds (0 = disabled)');
        table.string('parent_id', 20).nullable().comment('Parent channel ID (for announcements)');
        table.text('last_message_id', 20).nullable().comment('ID of the last message sent in this channel');
        table.integer('bitrate').nullable().comment('Bitrate in bits per second (voice channels only)');
        table.integer('user_limit').nullable().comment('Maximum users in voice channel (0 = unlimited)');
        table.string('rtc_region').nullable().comment('Voice region for voice channel');
    });
    await knex.raw(`
    ALTER TABLE channels DROP CONSTRAINT IF EXISTS chk_channel_type;
    ALTER TABLE channels ADD CONSTRAINT chk_channel_type
    CHECK (type IN ('text', 'voice', 'announcement', 'stage', 'forum'))
  `);
}
export async function down(knex) {
    await knex.raw(`
    ALTER TABLE channels DROP CONSTRAINT IF EXISTS chk_channel_type;
    ALTER TABLE channels ADD CONSTRAINT chk_channel_type
    CHECK (type IN ('text', 'voice', 'announcement'))
  `);
    await knex.schema.alterTable('channels', (table) => {
        table.dropColumn('category_id');
        table.dropColumn('nsfw');
        table.dropColumn('rate_limit_per_user');
        table.dropColumn('parent_id');
        table.dropColumn('last_message_id');
        table.dropColumn('bitrate');
        table.dropColumn('user_limit');
        table.dropColumn('rtc_region');
    });
}
//# sourceMappingURL=20260217100008_update_channels_table.js.map