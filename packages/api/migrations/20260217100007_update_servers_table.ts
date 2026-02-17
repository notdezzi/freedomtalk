import type { Knex } from 'knex';

/**
 * Migration: Update servers table with additional fields
 */
export async function up(knex: Knex): Promise<void> {
  // Helper to add column if it doesn't exist
  async function addColumnIfNotExists(table: string, column: string, type: string, defaultValue?: any) {
    const exists = await knex.schema.hasColumn(table, column);
    if (!exists) {
      if (defaultValue !== undefined) {
        await knex.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} NOT NULL DEFAULT '${defaultValue}'`);
      } else {
        await knex.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
    }
  }

  await addColumnIfNotExists('servers', 'default_role_id', 'VARCHAR(20)');
  await addColumnIfNotExists('servers', 'system_channel_id', 'VARCHAR(20)');
  await addColumnIfNotExists('servers', 'rules_channel_id', 'VARCHAR(20)');
  await addColumnIfNotExists('servers', 'public_updates_channel_id', 'VARCHAR(20)');
  await addColumnIfNotExists('servers', 'nsfw', 'BOOLEAN', false);
  await addColumnIfNotExists('servers', 'verified', 'BOOLEAN', false);
  await addColumnIfNotExists('servers', 'vanity_url_code', 'VARCHAR(20)');
  await addColumnIfNotExists('servers', 'description', 'TEXT');
  await addColumnIfNotExists('servers', 'splash_url', 'VARCHAR(500)');
  await addColumnIfNotExists('servers', 'discovery_splash_url', 'VARCHAR(500)');
  await addColumnIfNotExists('servers', 'member_count', 'INTEGER', 0);
  await addColumnIfNotExists('servers', 'max_members', 'INTEGER', 100000);
  await addColumnIfNotExists('servers', 'preferred_locale', 'VARCHAR(10)', 'en-US');
  await addColumnIfNotExists('servers', 'afk_timeout', 'BIGINT', 300);
  await addColumnIfNotExists('servers', 'afk_channel_id', 'VARCHAR(20)');

  // Add foreign key constraint if possible
  try {
    await knex.raw(`
      ALTER TABLE servers
      ADD CONSTRAINT fk_servers_default_role FOREIGN KEY (default_role_id) REFERENCES roles(id) ON DELETE SET NULL
    `);
  } catch {
    // Constraint may already exist or roles table may not be created yet
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE servers DROP CONSTRAINT IF EXISTS fk_servers_default_role`);

  const columns = [
    'default_role_id',
    'system_channel_id',
    'rules_channel_id',
    'public_updates_channel_id',
    'nsfw',
    'verified',
    'vanity_url_code',
    'description',
    'splash_url',
    'discovery_splash_url',
    'member_count',
    'max_members',
    'preferred_locale',
    'afk_timeout',
    'afk_channel_id',
  ];

  for (const col of columns) {
    const exists = await knex.schema.hasColumn('servers', col);
    if (exists) {
      await knex.raw(`ALTER TABLE servers DROP COLUMN ${col}`);
    }
  }
}
