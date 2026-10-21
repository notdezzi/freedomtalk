/**
 * Message Service
 *
 * Handles all message-related business logic including:
 * - Creating messages with Snowflake IDs
 * - Retrieving messages with pagination and filtering
 * - Updating messages with edit history tracking
 * - Soft and hard deletion
 * - Message preview generation
 * - Embed and link preview integration
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';
import { embedService, EmbedData } from '../embed/embed.service';
import { mentionService, ParsedMention, MentionType } from '../formatting/mention.service';
import { GroupedReaction } from '../reaction/reaction.service';
import { publishEvent } from '../../config/rabbitmq';

/**
 * Message interface matching database schema
 */
export interface Message {
  id: string;
  content: string;
  author_id: string;
  channel_id: string | null;
  server_id: string | null;
  dm_channel_id: string | null;
  is_edited: boolean;
  edited_at: Date | null;
  is_deleted: boolean;
  deleted_at: Date | null;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Mention data for messages
 */
export interface MentionData {
  mentions: ParsedMention[];
  mentionCounts: Record<MentionType, number>;
  mentionedUserIds: string[];
}

/**
 * Message with embeds response
 */
export interface MessageWithEmbeds extends Message {
  embeds?: EmbedData[];
  mentions?: MentionData;
  parsedContent?: string; // HTML-parsed content for client rendering
}

/**
 * Message history interface
 */
export interface MessageHistory {
  id: string;
  message_id: string;
  content: string;
  edited_by: string;
  edited_at: Date;
  created_at: Date;
}

/**
 * Keyset pagination boundary: the (created_at, id) tuple a cursor resolves to.
 * The id breaks ties between messages that share a created_at timestamp.
 */
export interface KeysetCursor {
  createdAt: Date;
  id: string;
}

/**
 * Sentinel message ID used when a cursor is a legacy plain ISO timestamp.
 * Snowflake IDs are all-digit strings and the id column is varchar, so this
 * sentinel compares greater than any real message ID lexicographically —
 * meaning "all messages at exactly this timestamp are inside the boundary".
 */
const TIMESTAMP_CURSOR_ID_SENTINEL = 'z';

/**
 * Parse a pagination cursor into a keyset boundary.
 *
 * Accepts three cursor forms (backward compatible):
 * 1. Composite cursor "createdAt|id" — the format returned by getMessages.
 *    `createdAt` is an ISO-8601 UTC timestamp, `id` the message ID of the last
 *    message on the previous page. This closes the tie-break gap that a
 *    timestamp-only cursor has when messages share created_at.
 * 2. Legacy message ID — resolved via a message lookup to (created_at, id).
 * 3. Legacy plain ISO timestamp — used directly as the created_at boundary
 *    with the high sentinel ID (all messages at that timestamp included).
 *
 * @param cursor - Raw cursor string in any of the supported forms
 * @returns Keyset boundary
 * @throws NotFoundError if a message-ID cursor cannot be resolved
 */
async function resolveKeysetCursor(cursor: string): Promise<KeysetCursor> {
  // 1. Composite "createdAt|id" (ISO timestamps never contain '|')
  const separatorIndex = cursor.indexOf('|');
  if (separatorIndex > 0) {
    const createdAt = new Date(cursor.slice(0, separatorIndex));
    const id = cursor.slice(separatorIndex + 1);
    if (!Number.isNaN(createdAt.getTime()) && id.length > 0) {
      return { createdAt, id };
    }
  }

  // 2. Legacy message ID (snowflake IDs are all digits)
  if (/^\d+$/.test(cursor)) {
    const message = await messageService.getMessage(cursor, false);
    return { createdAt: message.created_at, id: message.id };
  }

  // 3. Legacy plain ISO timestamp
  const timestamp = new Date(cursor);
  if (!Number.isNaN(timestamp.getTime())) {
    return { createdAt: timestamp, id: TIMESTAMP_CURSOR_ID_SENTINEL };
  }

  // Unknown format: fall through to the legacy message-ID lookup so the
  // caller gets the same NotFoundError an invalid ID cursor always produced
  const message = await messageService.getMessage(cursor, false);
  return { createdAt: message.created_at, id: message.id };
}

/**
 * Build a composite cursor from a message (see resolveKeysetCursor, form 1)
 * @param message - Message with created_at and id
 * @returns Composite cursor string "createdAt|id"
 */
function toCompositeCursor(message: { created_at: Date; id: string }): string {
  return `${message.created_at.toISOString()}|${message.id}`;
}

/**
 * Pagination cursor interface
 */
export interface PaginationCursor {
  before?: string; // Composite "createdAt|id" cursor, legacy message ID, or ISO timestamp (see resolveKeysetCursor)
  after?: string;  // Same accepted forms as `before`
  limit?: number;  // Number of messages to fetch (default: 50, max: 100)
}

/**
 * Message filter options
 */
export interface MessageFilter {
  authorId?: string;
  channelId?: string;
  dmChannelId?: string;
  isPinned?: boolean;
  search?: string; // Search in message content
  startDate?: Date;
  endDate?: Date;
}

/**
 * Message author info for responses
 */
export interface MessageAuthor {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  color?: number;
}

/**
 * Message with author info
 */
export interface MessageWithAuthor extends Message {
  author?: MessageAuthor;
  reactions?: GroupedReaction[];
}

/**
 * Paginated message response
 */
export interface PaginatedMessages {
  messages: MessageWithAuthor[];
  hasMore: boolean;
  /** Composite "createdAt|id" cursor for the next older page (see resolveKeysetCursor) */
  nextCursor?: string;
  /** Composite "createdAt|id" cursor of the first message on this page */
  prevCursor?: string;
}

/**
 * Message Service Class
 */
class MessageService {
  /**
   * Create a new message
   *
   * @param data - Message creation data
   * @param data.content - Message content (max 2000 characters)
   * @param data.authorId - User ID of the message author
   * @param data.channelId - Optional channel ID (for channel messages)
   * @param data.serverId - Optional server ID (for mention validation)
   * @param data.embeds - Optional array of embed data
   * @returns Created message with embeds and mentions
   * @throws NotFoundError if author doesn't exist
   * @throws ApiError if database operation fails
   */
  async createMessage(data: {
    content: string;
    authorId: string;
    channelId?: string;
    dmChannelId?: string;
    serverId?: string;
    embeds?: EmbedData[];
    /**
     * System/automation callers (webhooks) post with a non-user author id;
     * the users-table existence check is skipped for those callers only.
     */
    bypassAuthorCheck?: boolean;
    attachments?: Array<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
      url: string;
      description?: string;
    }>;
  }): Promise<MessageWithEmbeds> {
    try {
      // Verify author exists (skipped for webhook/system authors)
      if (!data.bypassAuthorCheck) {
        const author = await db('users').where({ id: data.authorId }).first();
        if (!author) {
          throw new NotFoundError('Author not found');
        }
      }

      // Parse and validate mentions
      const parsedMentions = mentionService.parseMentions(data.content);
      const mentionCounts = mentionService.countMentions(data.content);

      // Validate mentions if we have channel/server context
      if (parsedMentions.length > 0 && (data.channelId || data.serverId)) {
        const validation = await mentionService.validateMentions(
          parsedMentions,
          data.channelId,
          data.serverId
        );

        if (!validation.valid) {
          logger.warn({ invalidMentions: validation.invalidMentions, errors: validation.errors }, 'Invalid mentions in message');
          // We'll still create the message but log the invalid mentions
          // The client can decide how to handle them
        }
      }

      // Get mentioned user IDs for notifications
      const mentionedUserIds = await mentionService.getMentionedUsers(
        data.content,
        data.channelId,
        data.serverId
      );

      // Generate Snowflake ID for the message
      const messageId = generateSnowflakeId();
      const now = new Date();

      // Create message record and embeds in a transaction
      const message = await db.transaction(async (trx) => {
        // Insert message
        const messageRecord: Partial<Message> = {
          id: messageId,
          content: data.content,
          author_id: data.authorId,
          channel_id: data.channelId || null,
          dm_channel_id: data.dmChannelId || null,
          is_edited: false,
          edited_at: null,
          is_deleted: false,
          deleted_at: null,
          is_pinned: false,
          created_at: now,
          updated_at: now,
        };

        await trx('messages').insert(messageRecord);

        // Create embeds if provided
        let createdEmbeds: EmbedData[] = [];
        if (data.embeds && data.embeds.length > 0) {
          const embeds = await embedService.createEmbeds(messageId, data.embeds);
          // Convert Embed[] to EmbedData[] by removing database-specific fields
          createdEmbeds = embeds.map((e) => ({
            type: e.type,
            title: e.title || undefined,
            description: e.description || undefined,
            url: e.url || undefined,
            timestamp: e.timestamp || undefined,
            color: e.color || undefined,
            footer_text: e.footer_text || undefined,
            footer_icon_url: e.footer_icon_url || undefined,
            image_url: e.image_url || undefined,
            thumbnail_url: e.thumbnail_url || undefined,
            author_name: e.author_name || undefined,
            author_url: e.author_url || undefined,
            author_icon_url: e.author_icon_url || undefined,
            fields: e.fields || undefined,
          }));
        }

        return { message: messageRecord as Message, embeds: createdEmbeds };
      });

      logger.info(`Message created: ${messageId} by user ${data.authorId}, embeds: ${message.embeds?.length || 0}, mentions: ${parsedMentions.length}`);

      // Publish domain event for background workers (search indexing, embeds).
      // Fire-and-forget: a broker outage must never fail message creation.
      publishEvent({
        type: 'message.created',
        payload: {
          id: messageId,
          content: data.content,
          authorId: data.authorId,
          channelId: data.channelId ?? null,
          serverId: data.serverId ?? null,
          createdAt: (message.message.created_at as Date).toISOString(),
        },
      }).catch(() => undefined);

      // Build mention data for response
      const mentionData: MentionData = {
        mentions: parsedMentions,
        mentionCounts,
        mentionedUserIds,
      };

      return { ...message.message, embeds: message.embeds, mentions: mentionData };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error creating message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create message', 500);
    }
  }

  /**
   * Get a single message by ID
   *
   * @param id - Message ID
   * @param includeDeleted - Whether to include soft-deleted messages (default: false)
   * @returns Message
   * @throws NotFoundError if message doesn't exist or is deleted
   */
  async getMessage(id: string, includeDeleted = false): Promise<Message> {
    try {
      const query = db('messages').where({ id });

      if (!includeDeleted) {
        query.where({ is_deleted: false });
      }

      const message = await query.first();

      if (!message) {
        throw new NotFoundError('Message');
      }

      return message;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error fetching message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch message', 500);
    }
  }

  /**
   * Get multiple messages with pagination and filtering
   *
   * Keyset paginated on (created_at, id): the cursor boundary carries the
   * timestamp AND the message ID so messages sharing a created_at timestamp
   * are never skipped or repeated across pages. Cursors are returned in the
   * composite "createdAt|id" format; legacy message-ID and plain ISO
   * timestamp cursors are still accepted (see resolveKeysetCursor).
   *
   * @param cursor - Pagination cursor (before, after, limit)
   * @param filter - Optional filters (authorId, channelId, isPinned, search, dates)
   * @returns Paginated messages with cursor information
   */
  async getMessages(cursor: PaginationCursor = {}, filter: MessageFilter = {}): Promise<PaginatedMessages> {
    try {
      const limit = Math.min(cursor.limit || 50, 100); // Default 50, max 100

      // Defense in depth: message queries must be scoped to a channel or DM.
      // An unscoped query would return the entire platform's messages.
      if (!filter.channelId && !filter.dmChannelId) {
        throw new AppError(400, 'UNSCOPED_MESSAGE_QUERY', 'Message queries must be scoped to a channel or DM channel');
      }

      // Build base query
      let query = db('messages').where('messages.is_deleted', false);

      // Apply filters
      if (filter.authorId) {
        query = query.where('messages.author_id', filter.authorId);
      }

      if (filter.channelId) {
        query = query.where('messages.channel_id', filter.channelId);
      }

      if (filter.dmChannelId) {
        query = query.where('messages.dm_channel_id', filter.dmChannelId);
      }

      if (filter.isPinned !== undefined) {
        query = query.where('messages.is_pinned', filter.isPinned);
      }

      if (filter.search) {
        query = query.where('messages.content', 'ilike', `%${filter.search}%`);
      }

      if (filter.startDate) {
        query = query.where('messages.created_at', '>=', filter.startDate);
      }

      if (filter.endDate) {
        query = query.where('messages.created_at', '<=', filter.endDate);
      }

      // Apply keyset pagination on (created_at, id). The id tie-break prevents
      // messages sharing a created_at timestamp from being skipped or repeated
      // across pages (a timestamp-only boundary has that gap).
      if (cursor.before) {
        const before = await resolveKeysetCursor(cursor.before);
        query = query.where((builder) =>
          builder
            .where('messages.created_at', '<', before.createdAt)
            .orWhere((q) =>
              q
                .where('messages.created_at', '=', before.createdAt)
                .andWhere('messages.id', '<', before.id)
            )
        );
      }

      if (cursor.after) {
        const after = await resolveKeysetCursor(cursor.after);
        query = query.where((builder) =>
          builder
            .where('messages.created_at', '>', after.createdAt)
            .orWhere((q) =>
              q
                .where('messages.created_at', '=', after.createdAt)
                .andWhere('messages.id', '>', after.id)
            )
        );
      }

      // Fetch limit + 1 to determine if there are more messages
      // Join with users and user_profiles to get author info
      const messages = await query
        .leftJoin('users', 'messages.author_id', 'users.id')
        .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
        .select(
          'messages.*',
          'users.username as author_username',
          'user_profiles.display_name as author_display_name',
          'user_profiles.avatar_url as author_avatar'
        )
        .orderBy([
          { column: 'messages.created_at', order: 'desc' },
          { column: 'messages.id', order: 'desc' },
        ])
        .limit(limit + 1);

      // Get role colors for server messages
      const serverChannelIds = messages
        .filter(m => m.channel_id)
        .map(m => m.channel_id);

      const authorColors = new Map<string, number>();
      const channelToServer = new Map<string, string>();

      if (serverChannelIds.length > 0) {
        // Get server IDs for channels
        const channels = await db('channels')
          .whereIn('id', serverChannelIds)
          .select('id', 'server_id');

        channels.forEach(c => channelToServer.set(c.id, c.server_id));

        // Collect unique (server_id, user_id) pairs for the page
        const pairs: string[][] = [];
        const seenPairs = new Set<string>();
        for (const msg of messages) {
          if (!msg.channel_id) {
            continue;
          }
          const serverId = channelToServer.get(msg.channel_id);
          if (!serverId) {
            continue;
          }
          const key = `${serverId}:${msg.author_id}`;
          if (!seenPairs.has(key)) {
            seenPairs.add(key);
            pairs.push([serverId, msg.author_id]);
          }
        }

        // Resolve every author's highest-position colored role in ONE batched
        // query (rows arrive ordered by role position desc, so the first row
        // seen per pair wins — same result as the previous per-pair queries,
        // without the N+1 across large pages)
        if (pairs.length > 0) {
          const colorRows = await db('member_roles as smr')
            .join('roles as r', 'smr.role_id', 'r.id')
            .whereNotNull('r.color')
            .where('r.color', '>', 0)
            .whereIn(['smr.server_id', 'smr.user_id'], pairs)
            .orderBy('r.position', 'desc')
            .select('smr.server_id', 'smr.user_id', 'r.color');

          for (const row of colorRows) {
            const key = `${row.server_id}:${row.user_id}`;
            if (!authorColors.has(key)) {
              authorColors.set(key, row.color);
            }
          }
        }
      }

      // Determine if there are more messages
      const hasMore = messages.length > limit;
      const rawMessages = hasMore ? messages.slice(0, limit) : messages;

      // Fetch reactions for all messages
      const messageIds = rawMessages.map((msg) => msg.id);
      const reactionsMap = await this.getReactionsForMessages(messageIds);

      // Transform messages to include author data and reactions
      const resultMessages: MessageWithAuthor[] = rawMessages.map((msg) => {
        // Get author color for server messages
        let authorColor: number | undefined;
        if (msg.channel_id) {
          const serverId = channelToServer.get(msg.channel_id);
          if (serverId) {
            const color = authorColors.get(`${serverId}:${msg.author_id}`);
            authorColor = color || undefined;
          }
        }

        return {
          id: msg.id,
          content: msg.content,
          author_id: msg.author_id,
          channel_id: msg.channel_id,
          server_id: msg.server_id,
          dm_channel_id: msg.dm_channel_id,
          is_edited: msg.is_edited,
          edited_at: msg.edited_at,
          is_deleted: msg.is_deleted,
          deleted_at: msg.deleted_at,
          is_pinned: msg.is_pinned,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          author: msg.author_username ? {
            id: msg.author_id,
            username: msg.author_username,
            displayName: msg.author_display_name || undefined,
            avatar: msg.author_avatar || undefined,
            color: authorColor,
          } : undefined,
          reactions: reactionsMap.get(msg.id) || [],
        };
      });

      // Generate cursors (composite "createdAt|id" format — see
      // resolveKeysetCursor; legacy message-ID cursors remain accepted)
      const nextCursor = hasMore && rawMessages.length > 0
        ? toCompositeCursor(rawMessages[rawMessages.length - 1])
        : undefined;

      const prevCursor = rawMessages.length > 0
        ? toCompositeCursor(rawMessages[0])
        : undefined;

      return {
        messages: resultMessages,
        hasMore,
        nextCursor,
        prevCursor,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      logger.error({ error }, 'Error fetching messages');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch messages', 500);
    }
  }

  /**
   * Get reactions for multiple messages efficiently
   *
   * @param messageIds - Array of message IDs
   * @returns Map of message ID to reactions array
   */
  private async getReactionsForMessages(messageIds: string[]): Promise<Map<string, GroupedReaction[]>> {
    const reactionsMap = new Map<string, GroupedReaction[]>();

    if (messageIds.length === 0) {
      return reactionsMap;
    }

    try {
      // Fetch all reactions for the given messages
      const reactions = await db('reactions')
        .whereIn('message_id', messageIds)
        .orderBy('created_at', 'asc');

      // Group reactions by message_id and then by emoji
      for (const reaction of reactions) {
        const messageId = reaction.message_id;

        if (!reactionsMap.has(messageId)) {
          reactionsMap.set(messageId, []);
        }

        const messageReactions = reactionsMap.get(messageId)!;
        let groupedReaction = messageReactions.find(
          (r) => (r.emoji_type === 'custom' && r.emoji_id === reaction.emoji_id) ||
                 (r.emoji_type === 'unicode' && r.emoji_unicode === reaction.emoji_unicode)
        );

        if (!groupedReaction) {
          groupedReaction = {
            emoji_type: reaction.emoji_type,
            emoji_id: reaction.emoji_id,
            emoji_unicode: reaction.emoji_unicode,
            count: 0,
            users: [],
            me: false,
          };
          messageReactions.push(groupedReaction);
        }

        groupedReaction.count++;
        groupedReaction.users.push(reaction.user_id);
      }

      return reactionsMap;
    } catch (error) {
      logger.error({ error, messageIds }, 'Error fetching reactions for messages');
      // Return empty map on error rather than throwing
      return reactionsMap;
    }
  }

  /**
   * Update a message and track edit history
   *
   * @param id - Message ID
   * @param content - New message content
   * @param editorId - User ID of the editor
   * @param serverId - Optional server ID for mention validation
   * @returns Updated message with mentions
   * @throws NotFoundError if message doesn't exist
   * @throws ConflictError if message is deleted
   * @throws ApiError if database operation fails
   */
  async updateMessage(id: string, content: string, editorId: string, serverId?: string): Promise<MessageWithEmbeds> {
    try {
      // Get existing message (include deleted to check status)
      const existingMessage = await this.getMessage(id, true);

      if (existingMessage.is_deleted) {
        throw new ConflictError('Cannot edit deleted message');
      }

      // Parse and validate mentions in new content
      const parsedMentions = mentionService.parseMentions(content);
      const mentionCounts = mentionService.countMentions(content);

      // Get mentioned user IDs for notifications
      const mentionedUserIds = await mentionService.getMentionedUsers(
        content,
        existingMessage.channel_id || undefined,
        serverId
      );

      // Store previous content in history and update the message atomically
      const historyId = generateSnowflakeId();
      const now = new Date();

      const historyRecord: Partial<MessageHistory> = {
        id: historyId,
        message_id: id,
        content: existingMessage.content,
        edited_by: editorId,
        edited_at: now,
        created_at: now,
      };

      await db.transaction(async (trx) => {
        await trx('message_history').insert(historyRecord);

        await trx('messages')
          .where({ id })
          .update({
            content,
            is_edited: true,
            edited_at: now,
            updated_at: now,
          });
      });

      logger.info(`Message updated: ${id} by user ${editorId}, mentions: ${parsedMentions.length}`);

      // Publish domain event so workers re-index the edited content.
      publishEvent({
        type: 'message.updated',
        payload: {
          id,
          content,
          authorId: existingMessage.author_id,
          channelId: existingMessage.channel_id || null,
          serverId: existingMessage.server_id || null,
          createdAt: (existingMessage.created_at as Date).toISOString(),
        },
      }).catch(() => undefined);

      // Build mention data for response
      const mentionData: MentionData = {
        mentions: parsedMentions,
        mentionCounts,
        mentionedUserIds,
      };

      // Return updated message with mentions
      const updatedMessage = await this.getMessage(id, false);
      return { ...updatedMessage, mentions: mentionData };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error({ error }, 'Error updating message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update message', 500);
    }
  }

  /**
   * Soft delete a message (mark as deleted but keep in database)
   *
   * @param id - Message ID
   * @param deleterId - User ID of the deleter
   * @throws NotFoundError if message doesn't exist
   * @throws ConflictError if message is already deleted
   */
  async softDeleteMessage(id: string, deleterId: string): Promise<void> {
    try {
      const message = await this.getMessage(id, true);

      if (message.is_deleted) {
        throw new ConflictError('Message is already deleted');
      }

      const now = new Date();

      await db('messages')
        .where({ id })
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now,
        });

      logger.info(`Message soft deleted: ${id} by user ${deleterId}`);

      // Publish domain event so workers remove the message from search index.
      publishEvent({
        type: 'message.deleted',
        payload: {
          id,
          content: '',
          authorId: message.author_id,
          channelId: message.channel_id || null,
          serverId: message.server_id || null,
          createdAt: (message.created_at as Date).toISOString(),
        },
      }).catch(() => undefined);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error({ error }, 'Error soft deleting message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete message', 500);
    }
  }

  /**
   * Hard delete a message (permanently remove from database)
   * Also deletes all associated history records (CASCADE)
   *
   * @param id - Message ID
   * @throws NotFoundError if message doesn't exist
   */
  async hardDeleteMessage(id: string): Promise<void> {
    try {
      // Verify message exists (include deleted messages)
      await this.getMessage(id, true);

      // Delete message (CASCADE will delete history records)
      const deleted = await db('messages').where({ id }).del();

      if (deleted === 0) {
        throw new NotFoundError('Message');
      }

      logger.info(`Message hard deleted: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error hard deleting message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to permanently delete message', 500);
    }
  }

  /**
   * Get edit history for a message
   *
   * @param messageId - Message ID
   * @returns Array of message history records, ordered by edit time (newest first)
   * @throws NotFoundError if message doesn't exist
   */
  async getMessageHistory(messageId: string): Promise<MessageHistory[]> {
    try {
      // Verify message exists
      await this.getMessage(messageId, true); // Include deleted messages

      // Fetch history records
      const history = await db('message_history')
        .where({ message_id: messageId })
        .orderBy('edited_at', 'desc');

      return history;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error fetching message history');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch message history', 500);
    }
  }

  /**
   * Pin a message
   *
   * @param id - Message ID
   * @returns Updated message
   * @throws NotFoundError if message doesn't exist
   */
  async pinMessage(id: string): Promise<Message> {
    try {
      await this.getMessage(id, false);

      const now = new Date();

      await db('messages')
        .where({ id })
        .update({
          is_pinned: true,
          updated_at: now,
        });

      logger.info(`Message pinned: ${id}`);

      return this.getMessage(id, false);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error pinning message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to pin message', 500);
    }
  }

  /**
   * Unpin a message
   *
   * @param id - Message ID
   * @returns Updated message
   * @throws NotFoundError if message doesn't exist
   */
  async unpinMessage(id: string): Promise<Message> {
    try {
      await this.getMessage(id, false);

      const now = new Date();

      await db('messages')
        .where({ id })
        .update({
          is_pinned: false,
          updated_at: now,
        });

      logger.info(`Message unpinned: ${id}`);

      return this.getMessage(id, false);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error unpinning message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to unpin message', 500);
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();

