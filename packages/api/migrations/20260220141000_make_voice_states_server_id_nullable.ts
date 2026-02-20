import type { Knex } from 'knex';

/**
 * Migration: Make server_id nullable in voice_states for DM channel support
 * DM voice channels don't have a server association
 */
export async function up(knex: Knex): Promise<void> {
  // First drop the foreign key constraint
  await knex.raw(`
    ALTER TABLE voice_states
    DROP CONSTRAINT IF EXISTS voice_states_server_id_foreign
  `);

  // Then alter the column to be nullable
  await knex.raw(`
    ALTER TABLE voice_states
    ALTER COLUMN server_id DROP NOT NULL
  `);

  // Add a new foreign key constraint that allows nulls (ON DELETE SET NULL)
  await knex.raw(`
    ALTER TABLE voice_states
    ADD CONSTRAINT voice_states_server_id_foreign
    FOREIGN KEY (server_id) REFERENCES servers(id)
    ON DELETE SET NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  // First delete any voice states with null server_id (DM calls)
  await knex('voice_states').whereNull('server_id').delete();

  // Drop the nullable foreign key constraint
  await knex.raw(`
    ALTER TABLE voice_states
    DROP CONSTRAINT IF EXISTS voice_states_server_id_foreign
  `);

  // Make server_id NOT NULL again
  await knex.raw(`
    ALTER TABLE voice_states
    ALTER COLUMN server_id SET NOT NULL
  `);

  // Re-add the original foreign key constraint
  await knex.raw(`
    ALTER TABLE voice_states
    ADD CONSTRAINT voice_states_server_id_foreign
    FOREIGN KEY (server_id) REFERENCES servers(id)
    ON DELETE CASCADE
  `);
}
