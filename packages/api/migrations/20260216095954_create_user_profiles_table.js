export async function up(knex) {
    await knex.schema.createTable('user_profiles', (table) => {
        table.string('id', 20).primary().notNullable().comment('Snowflake ID');
        table.string('user_id', 20).unique().notNullable().comment('Reference to users.id');
        table.string('display_name', 100).nullable().comment('Display name (can differ from username)');
        table.text('bio').nullable().comment('User biography/about me');
        table.string('pronouns', 50).nullable().comment('User pronouns');
        table.string('avatar_url', 500).nullable().comment('Profile avatar image URL');
        table.string('banner_url', 500).nullable().comment('Profile banner image URL');
        table.string('splash_url', 500).nullable().comment('Profile splash/background image URL');
        table.string('custom_status', 200).nullable().comment('Custom status message');
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.index('user_id', 'idx_user_profiles_user_id');
        table.index('display_name', 'idx_user_profiles_display_name');
    });
    await knex.raw(`COMMENT ON TABLE user_profiles IS 'User profile information and customization'`);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('user_profiles');
}
//# sourceMappingURL=20260216095954_create_user_profiles_table.js.map