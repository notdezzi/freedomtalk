import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  // Add position column to servers table
  await knex.schema.alterTable('servers', (table) => {
    table.integer('position').defaultTo(0).notNullable();
  });

  // Set initial positions based on created_at order for existing servers
  const servers = await knex('servers')
    .select('id')
    .orderBy('created_at', 'asc');

  for (let i = 0; i < servers.length; i++) {
    await knex('servers')
      .where({ id: servers[i].id })
      .update({ position: i });
  }
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('servers', (table) => {
    table.dropColumn('position');
  });
}
