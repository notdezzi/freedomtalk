/**
 * Embed Service
 * Manages message embeds including creation, retrieval, validation, and deletion
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ApiError, ApiErrorCode, ValidationError } from '../../types/api.types';
import { logger } from '../../config/logger';
import { VALIDATION } from '@freedomtalk/shared';

/**
 * Embed field interface
 */
export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Embed data interface
 */
export interface EmbedData {
  type?: 'rich' | 'image' | 'video' | 'link' | 'article';
  title?: string;
  description?: string;
  url?: string;
  timestamp?: Date | string;
  color?: number;
  footer_text?: string;
  footer_icon_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  author_name?: string;
  author_url?: string;
  author_icon_url?: string;
  fields?: EmbedField[];
}

/**
 * Embed interface matching database schema
 */
export interface Embed {
  id: string;
  message_id: string;
  type: 'rich' | 'image' | 'video' | 'link' | 'article';
  title: string | null;
  description: string | null;
  url: string | null;
  timestamp: Date | null;
  color: number | null;
  footer_text: string | null;
  footer_icon_url: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  author_url: string | null;
  author_icon_url: string | null;
  fields: EmbedField[] | null;
  created_at: Date;
}

/**
 * Embed Service class
 */
class EmbedService {
  /**
   * Validate embed data against limits
   * @param embedData - Embed data to validate
   * @throws ValidationError if validation fails
   */
  validateEmbedData(embedData: EmbedData): void {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate title length
    if (embedData.title && embedData.title.length > VALIDATION.EMBED.MAX_TITLE_LENGTH) {
      errors.push({
        field: 'title',
        message: `Title must be at most ${VALIDATION.EMBED.MAX_TITLE_LENGTH} characters`,
      });
    }

    // Validate description length
    if (embedData.description && embedData.description.length > VALIDATION.EMBED.MAX_DESCRIPTION_LENGTH) {
      errors.push({
        field: 'description',
        message: `Description must be at most ${VALIDATION.EMBED.MAX_DESCRIPTION_LENGTH} characters`,
      });
    }

    // Validate footer length
    if (embedData.footer_text && embedData.footer_text.length > VALIDATION.EMBED.MAX_FOOTER_LENGTH) {
      errors.push({
        field: 'footer_text',
        message: `Footer text must be at most ${VALIDATION.EMBED.MAX_FOOTER_LENGTH} characters`,
      });
    }

    // Validate author name length
    if (embedData.author_name && embedData.author_name.length > VALIDATION.EMBED.MAX_AUTHOR_NAME_LENGTH) {
      errors.push({
        field: 'author_name',
        message: `Author name must be at most ${VALIDATION.EMBED.MAX_AUTHOR_NAME_LENGTH} characters`,
      });
    }

    // Validate fields
    if (embedData.fields) {
      if (embedData.fields.length > VALIDATION.EMBED.MAX_FIELDS) {
        errors.push({
          field: 'fields',
          message: `Maximum ${VALIDATION.EMBED.MAX_FIELDS} fields allowed`,
        });
      }

      embedData.fields.forEach((field, index) => {
        if (field.name.length > VALIDATION.EMBED.MAX_FIELD_NAME_LENGTH) {
          errors.push({
            field: `fields[${index}].name`,
            message: `Field name must be at most ${VALIDATION.EMBED.MAX_FIELD_NAME_LENGTH} characters`,
          });
        }
        if (field.value.length > VALIDATION.EMBED.MAX_FIELD_VALUE_LENGTH) {
          errors.push({
            field: `fields[${index}].value`,
            message: `Field value must be at most ${VALIDATION.EMBED.MAX_FIELD_VALUE_LENGTH} characters`,
          });
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Embed validation failed', errors);
    }
  }

  /**
   * Calculate total character count for an embed
   * @param embedData - Embed data
   * @returns Total character count
   */
  calculateTotalCharacters(embedData: EmbedData): number {
    let total = 0;

    if (embedData.title) total += embedData.title.length;
    if (embedData.description) total += embedData.description.length;
    if (embedData.footer_text) total += embedData.footer_text.length;
    if (embedData.author_name) total += embedData.author_name.length;

    if (embedData.fields) {
      embedData.fields.forEach(field => {
        total += field.name.length + field.value.length;
      });
    }

    return total;
  }

  /**
   * Create a single embed for a message
   * @param messageId - Message ID
   * @param embedData - Embed data
   * @returns Created embed
   * @throws ValidationError if validation fails
   */
  async createEmbed(messageId: string, embedData: EmbedData): Promise<Embed> {
    try {
      // Validate embed data
      this.validateEmbedData(embedData);

      // Generate Snowflake ID
      const embedId = generateSnowflakeId();
      const now = new Date();

      // Prepare embed record
      const embed: any = {
        id: embedId,
        message_id: messageId,
        type: embedData.type || 'rich',
        title: embedData.title || null,
        description: embedData.description || null,
        url: embedData.url || null,
        timestamp: embedData.timestamp ? new Date(embedData.timestamp) : null,
        color: embedData.color || null,
        footer_text: embedData.footer_text || null,
        footer_icon_url: embedData.footer_icon_url || null,
        image_url: embedData.image_url || null,
        thumbnail_url: embedData.thumbnail_url || null,
        author_name: embedData.author_name || null,
        author_url: embedData.author_url || null,
        author_icon_url: embedData.author_icon_url || null,
        fields: embedData.fields || null,
        created_at: now,
      };

      await db('message_embeds').insert(embed);

      logger.info({ embedId, messageId, type: embed.type }, 'Embed created');

      return {
        ...embed,
        fields: embedData.fields || null,
      } as Embed;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error({ error, messageId }, 'Error creating embed');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create embed', 500);
    }
  }

  /**
   * Create multiple embeds for a message
   * @param messageId - Message ID
   * @param embeds - Array of embed data
   * @returns Created embeds
   * @throws ValidationError if validation fails
   */
  async createEmbeds(messageId: string, embeds: EmbedData[]): Promise<Embed[]> {
    try {
      // Validate max embeds limit
      if (embeds.length > VALIDATION.EMBED.MAX_PER_MESSAGE) {
        throw new ValidationError(`Maximum ${VALIDATION.EMBED.MAX_PER_MESSAGE} embeds allowed per message`);
      }

      // Validate each embed
      embeds.forEach(embedData => this.validateEmbedData(embedData));

      // Calculate total characters across all embeds
      const totalChars = embeds.reduce((sum, embedData) => sum + this.calculateTotalCharacters(embedData), 0);
      if (totalChars > VALIDATION.EMBED.MAX_TOTAL_CHARACTERS) {
        throw new ValidationError(
          `Total embed characters (${totalChars}) exceeds maximum ${VALIDATION.EMBED.MAX_TOTAL_CHARACTERS}`
        );
      }

      // Create all embeds in a transaction
      const createdEmbeds = await db.transaction(async (trx) => {
        const embedRecords: Embed[] = [];

        for (const embedData of embeds) {
          const embedId = generateSnowflakeId();
          const now = new Date();

          const embed: any = {
            id: embedId,
            message_id: messageId,
            type: embedData.type || 'rich',
            title: embedData.title || null,
            description: embedData.description || null,
            url: embedData.url || null,
            timestamp: embedData.timestamp ? new Date(embedData.timestamp) : null,
            color: embedData.color || null,
            footer_text: embedData.footer_text || null,
            footer_icon_url: embedData.footer_icon_url || null,
            image_url: embedData.image_url || null,
            thumbnail_url: embedData.thumbnail_url || null,
            author_name: embedData.author_name || null,
            author_url: embedData.author_url || null,
            author_icon_url: embedData.author_icon_url || null,
            fields: embedData.fields || null,
            created_at: now,
          };

          await trx('message_embeds').insert(embed);

          embedRecords.push({
            ...embed,
            fields: embedData.fields || null,
          } as Embed);
        }

        return embedRecords;
      });

      logger.info({ messageId, count: createdEmbeds.length }, 'Embeds created');

      return createdEmbeds;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error({ error, messageId }, 'Error creating embeds');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create embeds', 500);
    }
  }

  /**
   * Get all embeds for a message
   * @param messageId - Message ID
   * @returns Array of embeds
   */
  async getEmbedsByMessage(messageId: string): Promise<Embed[]> {
    try {
      const embeds = await db('message_embeds')
        .where({ message_id: messageId })
        .orderBy('created_at', 'asc');

      // Parse JSONB fields
      return embeds.map(embed => ({
        ...embed,
        fields: embed.fields ? (typeof embed.fields === 'string' ? JSON.parse(embed.fields) : embed.fields) : null,
      }));
    } catch (error) {
      logger.error({ error, messageId }, 'Error fetching embeds');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch embeds', 500);
    }
  }

  /**
   * Update an embed
   * @param embedId - Embed ID
   * @param embedData - Updated embed data
   * @returns Updated embed
   * @throws NotFoundError if embed doesn't exist
   * @throws ValidationError if validation fails
   */
  async updateEmbed(embedId: string, embedData: EmbedData): Promise<Embed> {
    try {
      // Check if embed exists
      const existing = await db('message_embeds').where({ id: embedId }).first();
      if (!existing) {
        throw new NotFoundError('Embed');
      }

      // Validate embed data
      this.validateEmbedData(embedData);

      // Prepare update data
      const updateData: any = {
        type: embedData.type || existing.type,
        title: embedData.title !== undefined ? embedData.title : existing.title,
        description: embedData.description !== undefined ? embedData.description : existing.description,
        url: embedData.url !== undefined ? embedData.url : existing.url,
        timestamp: embedData.timestamp ? new Date(embedData.timestamp) : existing.timestamp,
        color: embedData.color !== undefined ? embedData.color : existing.color,
        footer_text: embedData.footer_text !== undefined ? embedData.footer_text : existing.footer_text,
        footer_icon_url: embedData.footer_icon_url !== undefined ? embedData.footer_icon_url : existing.footer_icon_url,
        image_url: embedData.image_url !== undefined ? embedData.image_url : existing.image_url,
        thumbnail_url: embedData.thumbnail_url !== undefined ? embedData.thumbnail_url : existing.thumbnail_url,
        author_name: embedData.author_name !== undefined ? embedData.author_name : existing.author_name,
        author_url: embedData.author_url !== undefined ? embedData.author_url : existing.author_url,
        author_icon_url: embedData.author_icon_url !== undefined ? embedData.author_icon_url : existing.author_icon_url,
        fields: embedData.fields !== undefined ? embedData.fields : existing.fields,
      };

      await db('message_embeds').where({ id: embedId }).update(updateData);

      logger.info({ embedId }, 'Embed updated');

      // Fetch and return updated embed
      const updated = await db('message_embeds').where({ id: embedId }).first();
      return {
        ...updated,
        fields: updated.fields ? (typeof updated.fields === 'string' ? JSON.parse(updated.fields) : updated.fields) : null,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error({ error, embedId }, 'Error updating embed');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update embed', 500);
    }
  }

  /**
   * Delete an embed
   * @param embedId - Embed ID
   * @returns True if deleted
   * @throws NotFoundError if embed doesn't exist
   */
  async deleteEmbed(embedId: string): Promise<boolean> {
    try {
      const deleted = await db('message_embeds').where({ id: embedId }).delete();

      if (deleted === 0) {
        throw new NotFoundError('Embed');
      }

      logger.info({ embedId }, 'Embed deleted');

      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, embedId }, 'Error deleting embed');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete embed', 500);
    }
  }
}

// Export singleton instance
export const embedService = new EmbedService();


