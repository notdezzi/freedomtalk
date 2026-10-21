/**
 * Message Pagination Integration Tests
 *
 * Exercises the keyset pagination on (created_at, id) in
 * MessageService.getMessages against the Testcontainers database:
 * - Page walk with composite cursors: order (created_at DESC, id DESC),
 *   page size, no duplicates/missing messages across pages
 * - Tie-break behavior for messages sharing a created_at timestamp
 * - Backward compatibility: legacy message-ID and plain ISO timestamp cursors
 *
 * Messages are inserted directly (bypassing createMessage) so created_at
 * timestamps and IDs are fully controlled.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../config/database';
import { generateSnowflakeId } from '../../../utils/snowflake';
import { messageService } from '../message.service';
import {
  createTestServerFixture,
  cleanupTestServerFixture,
  TestServerFixture,
} from '../../../testing/fixtures';

const PAGE_LIMIT = 10;
const MESSAGE_COUNT = 25;

describe('MessageService.getMessages keyset pagination', () => {
  let fixture: TestServerFixture;
  // Messages by creation index (0 = oldest): id and created_at
  let messageIds: string[] = [];
  let tieTimestamp: Date; // created_at shared by messages #9 and #10
  let orderedIds: string[] = []; // expected order: created_at DESC, id DESC

  beforeAll(async () => {
    fixture = await createTestServerFixture('pagination-test');

    const baseTime = new Date('2026-01-01T00:00:00.000Z');
    tieTimestamp = new Date(baseTime.getTime() + 10 * 1000); // message #10's slot

    // Build (id, createdAt) for 25 messages, oldest → newest. Messages #9
    // and #10 share the same created_at with #10 having the greater ID, so
    // correct keyset order is #10 before #9.
    // Generate all IDs first
    for (let i = 0; i < MESSAGE_COUNT; i++) {
      messageIds.push(generateSnowflakeId());
    }

    // Make the tie deterministic BEFORE inserting: #10's ID is exactly
    // #9's ID + 1 (so the tie pair orders #10 before #9 by id DESC)
    messageIds[10] = (BigInt(messageIds[9]!) + 1n).toString();

    for (let i = 0; i < MESSAGE_COUNT; i++) {
      const id = messageIds[i]!;
      const createdAt =
        i === 9 ? tieTimestamp : new Date(baseTime.getTime() + i * 1000);

      await db('messages').insert({
        id,
        content: `pagination message ${i}`,
        author_id: fixture.ownerId,
        channel_id: fixture.channelId,
        is_edited: false,
        is_deleted: false,
        is_pinned: false,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    // Expected order (newest → oldest): 24..11, then 10, 9 (tie), then 8..0
    orderedIds = [
      ...Array.from({ length: 14 }, (_, k) => messageIds[24 - k]!), // 24..11
      messageIds[10]!,
      messageIds[9]!,
      ...Array.from({ length: 9 }, (_, k) => messageIds[8 - k]!), // 8..0
    ];
  });

  afterAll(async () => {
    await db('messages').where('channel_id', fixture.channelId).del();
    await cleanupTestServerFixture(fixture);
  });

  it('walks the entire channel with composite cursors: ordered, sized, no dupes or gaps', async () => {
    const collectedIds: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    let done = false;

    while (!done) {
      const page = await messageService.getMessages(
        cursor ? { before: cursor, limit: PAGE_LIMIT } : { limit: PAGE_LIMIT },
        { channelId: fixture.channelId }
      );
      pages++;

      expect(page.messages.length).toBeLessThanOrEqual(PAGE_LIMIT);
      // Composite "createdAt|id" format
      if (page.nextCursor !== undefined) {
        expect(page.nextCursor).toMatch(/^\d{4}-\d{2}-\d{2}T.*\|\d+$/);
      }

      collectedIds.push(...page.messages.map((m) => m.id));

      if (!page.hasMore) {
        expect(page.nextCursor).toBeUndefined();
        done = true;
      } else {
        expect(page.nextCursor).toBeDefined();
        cursor = page.nextCursor;
      }
    }

    expect(pages).toBe(3); // 25 messages / limit 10
    expect(collectedIds).toHaveLength(MESSAGE_COUNT);
    expect(new Set(collectedIds).size).toBe(MESSAGE_COUNT); // no duplicates
    expect(collectedIds).toEqual(orderedIds); // created_at DESC, id DESC
  });

  it('never skips or repeats messages sharing a created_at across page boundaries', async () => {
    // Page of 15 ends exactly on message #10 (tieTimestamp, greater ID)
    const page1 = await messageService.getMessages(
      { limit: 15 },
      { channelId: fixture.channelId }
    );
    expect(page1.messages).toHaveLength(15);
    expect(page1.messages[page1.messages.length - 1]!.id).toBe(messageIds[10]);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeDefined();

    // The composite cursor carries the tie pair's shared timestamp
    expect(page1.nextCursor).toBe(`${tieTimestamp.toISOString()}|${messageIds[10]}`);

    const page2 = await messageService.getMessages(
      { before: page1.nextCursor, limit: 15 },
      { channelId: fixture.channelId }
    );

    // Message #9 shares the timestamp with #10 but has the smaller ID: it is
    // the first message of the next page, and #10 is not repeated
    expect(page2.messages[0]!.id).toBe(messageIds[9]);
    expect(page2.messages.map((m) => m.id)).not.toContain(messageIds[10]);

    const page1Ids = page1.messages.map((m) => m.id);
    for (const id of page2.messages.map((m) => m.id)) {
      expect(page1Ids).not.toContain(id);
    }
  });

  it('tie-breaks correctly in both directions around the shared timestamp', async () => {
    // Boundary at (tieTimestamp, id10): includes same-timestamp messages with id < id10
    const beforeTie10 = await messageService.getMessages(
      { before: `${tieTimestamp.toISOString()}|${messageIds[10]}`, limit: 50 },
      { channelId: fixture.channelId }
    );
    expect(beforeTie10.messages[0]!.id).toBe(messageIds[9]);
    expect(beforeTie10.messages.map((m) => m.id)).not.toContain(messageIds[10]);

    // Boundary at (tieTimestamp, id9): the whole tie pair is now excluded
    const beforeTie9 = await messageService.getMessages(
      { before: `${tieTimestamp.toISOString()}|${messageIds[9]}`, limit: 50 },
      { channelId: fixture.channelId }
    );
    expect(beforeTie9.messages[0]!.id).toBe(messageIds[8]);
    expect(beforeTie9.messages.map((m) => m.id)).not.toContain(messageIds[9]);
    expect(beforeTie9.messages.map((m) => m.id)).not.toContain(messageIds[10]);
  });

  it('accepts a legacy message-ID cursor (old route contract)', async () => {
    const page = await messageService.getMessages(
      { before: messageIds[10], limit: 50 },
      { channelId: fixture.channelId }
    );

    // Resolves to (tieTimestamp, id10): #9 (same ts, smaller id) comes first,
    // #10 itself is excluded — same semantics as the composite cursor
    expect(page.messages[0]!.id).toBe(messageIds[9]);
    expect(page.messages.map((m) => m.id)).not.toContain(messageIds[10]);
  });

  it('accepts a legacy plain ISO timestamp cursor', async () => {
    const page = await messageService.getMessages(
      { before: tieTimestamp.toISOString(), limit: 50 },
      { channelId: fixture.channelId }
    );

    // Timestamp-only boundary uses the high sentinel ID, so BOTH messages at
    // tieTimestamp are included: #10 then #9, then the rest of the history
    expect(page.messages[0]!.id).toBe(messageIds[10]);
    expect(page.messages[1]!.id).toBe(messageIds[9]);
    expect(page.messages).toHaveLength(11); // messages 0..10
    expect(page.hasMore).toBe(false);
  });
});
