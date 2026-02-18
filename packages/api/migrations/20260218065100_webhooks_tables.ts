import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  // Create webhooks table
  await knex.schema.createTable('webhooks', (table) => {
    table.string('id', 20).primary(); // Snowflake ID
    table.string('server_id', 20).notNullable().references('id').inTable('servers').onDelete('CASCADE');
    table.string('channel_id', 20).notNullable().references('id').inTable('channels').onDelete('CASCADE');
    table.string('name', 80).notNullable();
    table.string('avatar', 255).nullable();
    table.string('token', 64).notNullable(); // Secure token for webhook URL
    table.string('created_by', 20).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['server_id']);
    table.index(['channel_id']);
    table.index(['token']);
  });

  // Create webhook_events table for tracking webhook executions
  await knex.schema.createTable('webhook_events', (table) => {
    table.string('id', 20).primary(); // Snowflake ID
    table.string('webhook_id', 20).notNullable().references('id').inTable('webhooks').onDelete('CASCADE');
    table.string('event_type', 50).notNullable(); // message, update, delete, etc.
    table.jsonb('payload').notNullable(); // The data sent to webhook
    table.string('status', 20).notNullable().defaultTo('pending'); // pending, success, failed
    table.integer('response_code').nullable();
    table.text('error_message').nullable();
    table.timestamp('executed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['webhook_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhook_events');
  await knex.schema.dropTableIfExists('webhooks');
}
