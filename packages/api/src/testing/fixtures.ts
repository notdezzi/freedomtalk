/**
 * Shared integration-test fixtures
 *
 * Creates a minimal but FK-consistent server/channel structure for suites
 * that insert messages directly into the database.
 */

import { db } from '../config/database';
import { generateSnowflakeId } from '../utils/snowflake';

export interface TestServerFixture {
  ownerId: string;
  serverId: string;
  channelId: string;
}

/**
 * Creates an owner user, a server and a text channel (with the default
 * @everyone role Discord-style bootstrap omitted — messages only need the
 * channel row to exist).
 */
export async function createTestServerFixture(
  name: string
): Promise<TestServerFixture> {
  const ownerId = generateSnowflakeId();
  const serverId = generateSnowflakeId();
  const channelId = generateSnowflakeId();

  await db('users').insert({
    id: ownerId,
    email: `${name}-owner@example.com`,
    username: `${name}_owner`,
    password_hash: 'hash',
    created_at: new Date(),
    updated_at: new Date(),
  });
  await db('servers').insert({ id: serverId, name: `${name} Server`, owner_id: ownerId });
  await db('channels').insert({ id: channelId, server_id: serverId, name: `${name}-channel`, type: 'text' });

  return { ownerId, serverId, channelId };
}

/**
 * Removes the fixture rows. Call AFTER deleting rows that reference the
 * channel (messages, attachments, ...).
 */
export async function cleanupTestServerFixture(fixture: TestServerFixture): Promise<void> {
  await db('channels').where('id', fixture.channelId).del();
  await db('servers').where('id', fixture.serverId).del();
  await db('users').where('id', fixture.ownerId).del();
}
