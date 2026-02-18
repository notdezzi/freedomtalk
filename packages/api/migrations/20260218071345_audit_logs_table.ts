import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  // Create audit_logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.string('id', 20).primary(); // Snowflake ID
    table.string('server_id', 20).notNullable().references('id').inTable('servers').onDelete('CASCADE');
    table.string('user_id', 20).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('action_type', 50).notNullable(); // e.g., 'CHANNEL_CREATE', 'ROLE_UPDATE', 'MEMBER_KICK'
    table.string('target_type', 50).nullable(); // e.g., 'CHANNEL', 'ROLE', 'MEMBER', 'WEBHOOK'
    table.string('target_id', 20).nullable(); // ID of the affected entity
    table.jsonb('changes').nullable(); // { before: {...}, after: {...} }
    table.string('reason', 500).nullable(); // Optional reason for the action
    table.jsonb('metadata').nullable(); // Additional context (e.g., options selected)
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for common queries
    table.index(['server_id']);
    table.index(['user_id']);
    table.index(['action_type']);
    table.index(['target_id']);
    table.index(['created_at']);
    table.index(['server_id', 'action_type']);
    table.index(['server_id', 'created_at']);
  });

  // Create enum types for audit log action types
  // Note: PostgreSQL enums are more efficient, but we'll use string validation in the app
  // for flexibility across different database backends
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
