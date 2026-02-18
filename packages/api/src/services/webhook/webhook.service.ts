/**
 * Webhook Service
 *
 * Handles all webhook-related business logic including:
 * - CRUD operations for webhooks
 * - Webhook token generation and validation
 * - Webhook execution
 * - Event tracking
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError } from '../../types/api.types';
import { logger } from '../../config/logger';
import { messageService } from '../message/message.service';
import crypto from 'crypto';

/**
 * Webhook interface matching database schema
 */
export interface Webhook {
  id: string;
  server_id: string;
  channel_id: string;
  name: string;
  avatar: string | null;
  token: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Webhook event interface matching database schema
 */
export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  response_code: number | null;
  error_message: string | null;
  executed_at: Date | null;
  created_at: Date;
}

/**
 * Webhook creation data
 */
export interface CreateWebhookData {
  serverId: string;
  channelId: string;
  name: string;
  avatar?: string;
  createdBy: string;
}

/**
 * Webhook update data
 */
export interface UpdateWebhookData {
  name?: string;
  avatar?: string;
  channelId?: string;
}

/**
 * Generate a secure token for webhook URL
 */
function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Webhook Service Class
 */
class WebhookService {
  /**
   * Create a new webhook
   */
  async createWebhook(data: CreateWebhookData): Promise<Webhook> {
    const id = generateSnowflakeId();
    const token = generateWebhookToken();

    const [webhook] = await db('webhooks')
      .insert({
        id,
        server_id: data.serverId,
        channel_id: data.channelId,
        name: data.name,
        avatar: data.avatar || null,
        token,
        created_by: data.createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    logger.info({ webhookId: id, serverId: data.serverId }, 'Webhook created');
    return webhook;
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(webhookId: string): Promise<Webhook | null> {
    const webhook = await db('webhooks').where({ id: webhookId }).first();
    return webhook || null;
  }

  /**
   * Get webhook by Token (for execution endpoint)
   */
  async getWebhookByToken(token: string): Promise<Webhook | null> {
    const webhook = await db('webhooks').where({ token }).first();
    return webhook || null;
  }

  /**
   * Get all webhooks for a server
   */
  async getServerWebhooks(serverId: string): Promise<Webhook[]> {
    return db('webhooks').where({ server_id: serverId }).orderBy('created_at', 'desc');
  }

  /**
   * Get all webhooks for a channel
   */
  async getChannelWebhooks(channelId: string): Promise<Webhook[]> {
    return db('webhooks').where({ channel_id: channelId }).orderBy('created_at', 'desc');
  }

  /**
   * Update a webhook
   */
  async updateWebhook(webhookId: string, data: UpdateWebhookData): Promise<Webhook> {
    const webhook = await this.getWebhookById(webhookId);
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.channelId !== undefined) updateData.channel_id = data.channelId;

    const [updated] = await db('webhooks')
      .where({ id: webhookId })
      .update(updateData)
      .returning('*');

    logger.info({ webhookId }, 'Webhook updated');
    return updated;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const webhook = await this.getWebhookById(webhookId);
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    await db('webhooks').where({ id: webhookId }).del();
    logger.info({ webhookId }, 'Webhook deleted');
  }

  /**
   * Regenerate webhook token
   */
  async regenerateToken(webhookId: string): Promise<string> {
    const webhook = await this.getWebhookById(webhookId);
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const newToken = generateWebhookToken();
    await db('webhooks').where({ id: webhookId }).update({
      token: newToken,
      updated_at: new Date(),
    });

    logger.info({ webhookId }, 'Webhook token regenerated');
    return newToken;
  }

  /**
   * Execute a webhook (send a message)
   */
  async executeWebhook(
    token: string,
    content: string,
    options?: {
      username?: string;
      avatarUrl?: string;
      embeds?: Record<string, unknown>[];
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const webhook = await this.getWebhookByToken(token);
    if (!webhook) {
      throw new NotFoundError('Invalid webhook token');
    }

    try {
      const message = await messageService.createMessage({
        channelId: webhook.channel_id,
        authorId: webhook.id, // Use webhook ID as author
        content,
      });

      // Log the webhook execution
      await this.logWebhookEvent({
        webhookId: webhook.id,
        eventType: 'message',
        payload: { content, options },
        status: 'success',
        responseCode: 200,
      });

      return { success: true, messageId: message.id };
    } catch (error) {
      // Log the failed execution
      await this.logWebhookEvent({
        webhookId: webhook.id,
        eventType: 'message',
        payload: { content, options },
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Log a webhook event
   */
  async logWebhookEvent(data: {
    webhookId: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'success' | 'failed';
    responseCode?: number;
    errorMessage?: string;
  }): Promise<WebhookEvent> {
    const id = generateSnowflakeId();

    const [event] = await db('webhook_events')
      .insert({
        id,
        webhook_id: data.webhookId,
        event_type: data.eventType,
        payload: JSON.parse(JSON.stringify(data.payload)),
        status: data.status,
        response_code: data.responseCode || null,
        error_message: data.errorMessage || null,
        executed_at: data.status !== 'pending' ? new Date() : null,
        created_at: new Date(),
      })
      .returning('*');

    return event;
  }

  /**
   * Get webhook events (for debugging/audit)
   */
  async getWebhookEvents(
    webhookId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ events: WebhookEvent[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [countResult] = await db('webhook_events')
      .where({ webhook_id: webhookId })
      .count('id as count');

    const total = Number(countResult?.count || 0);

    const events = await db('webhook_events')
      .where({ webhook_id: webhookId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { events, total };
  }
}

export const webhookService = new WebhookService();
export default webhookService;
