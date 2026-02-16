import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ApiError, ApiErrorCode, ValidationError } from '../../types/api.types';
import { logger } from '../../config/logger';
import { VALIDATION } from '@freedomtalk/shared';
class EmbedService {
    validateEmbedData(embedData) {
        const errors = [];
        if (embedData.title && embedData.title.length > VALIDATION.EMBED.MAX_TITLE_LENGTH) {
            errors.push({
                field: 'title',
                message: `Title must be at most ${VALIDATION.EMBED.MAX_TITLE_LENGTH} characters`,
            });
        }
        if (embedData.description && embedData.description.length > VALIDATION.EMBED.MAX_DESCRIPTION_LENGTH) {
            errors.push({
                field: 'description',
                message: `Description must be at most ${VALIDATION.EMBED.MAX_DESCRIPTION_LENGTH} characters`,
            });
        }
        if (embedData.footer_text && embedData.footer_text.length > VALIDATION.EMBED.MAX_FOOTER_LENGTH) {
            errors.push({
                field: 'footer_text',
                message: `Footer text must be at most ${VALIDATION.EMBED.MAX_FOOTER_LENGTH} characters`,
            });
        }
        if (embedData.author_name && embedData.author_name.length > VALIDATION.EMBED.MAX_AUTHOR_NAME_LENGTH) {
            errors.push({
                field: 'author_name',
                message: `Author name must be at most ${VALIDATION.EMBED.MAX_AUTHOR_NAME_LENGTH} characters`,
            });
        }
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
    calculateTotalCharacters(embedData) {
        let total = 0;
        if (embedData.title)
            total += embedData.title.length;
        if (embedData.description)
            total += embedData.description.length;
        if (embedData.footer_text)
            total += embedData.footer_text.length;
        if (embedData.author_name)
            total += embedData.author_name.length;
        if (embedData.fields) {
            embedData.fields.forEach(field => {
                total += field.name.length + field.value.length;
            });
        }
        return total;
    }
    async createEmbed(messageId, embedData) {
        try {
            this.validateEmbedData(embedData);
            const embedId = generateSnowflakeId();
            const now = new Date();
            const embed = {
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
            };
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error({ error, messageId }, 'Error creating embed');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create embed', 500);
        }
    }
    async createEmbeds(messageId, embeds) {
        try {
            if (embeds.length > VALIDATION.EMBED.MAX_PER_MESSAGE) {
                throw new ValidationError(`Maximum ${VALIDATION.EMBED.MAX_PER_MESSAGE} embeds allowed per message`);
            }
            embeds.forEach(embedData => this.validateEmbedData(embedData));
            const totalChars = embeds.reduce((sum, embedData) => sum + this.calculateTotalCharacters(embedData), 0);
            if (totalChars > VALIDATION.EMBED.MAX_TOTAL_CHARACTERS) {
                throw new ValidationError(`Total embed characters (${totalChars}) exceeds maximum ${VALIDATION.EMBED.MAX_TOTAL_CHARACTERS}`);
            }
            const createdEmbeds = await db.transaction(async (trx) => {
                const embedRecords = [];
                for (const embedData of embeds) {
                    const embedId = generateSnowflakeId();
                    const now = new Date();
                    const embed = {
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
                    });
                }
                return embedRecords;
            });
            logger.info({ messageId, count: createdEmbeds.length }, 'Embeds created');
            return createdEmbeds;
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error({ error, messageId }, 'Error creating embeds');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create embeds', 500);
        }
    }
    async getEmbedsByMessage(messageId) {
        try {
            const embeds = await db('message_embeds')
                .where({ message_id: messageId })
                .orderBy('created_at', 'asc');
            return embeds.map(embed => ({
                ...embed,
                fields: embed.fields ? (typeof embed.fields === 'string' ? JSON.parse(embed.fields) : embed.fields) : null,
            }));
        }
        catch (error) {
            logger.error({ error, messageId }, 'Error fetching embeds');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch embeds', 500);
        }
    }
    async updateEmbed(embedId, embedData) {
        try {
            const existing = await db('message_embeds').where({ id: embedId }).first();
            if (!existing) {
                throw new NotFoundError('Embed');
            }
            this.validateEmbedData(embedData);
            const updateData = {
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
            const updated = await db('message_embeds').where({ id: embedId }).first();
            return {
                ...updated,
                fields: updated.fields ? (typeof updated.fields === 'string' ? JSON.parse(updated.fields) : updated.fields) : null,
            };
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            logger.error({ error, embedId }, 'Error updating embed');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update embed', 500);
        }
    }
    async deleteEmbed(embedId) {
        try {
            const deleted = await db('message_embeds').where({ id: embedId }).delete();
            if (deleted === 0) {
                throw new NotFoundError('Embed');
            }
            logger.info({ embedId }, 'Embed deleted');
            return true;
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, embedId }, 'Error deleting embed');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete embed', 500);
        }
    }
}
export const embedService = new EmbedService();
//# sourceMappingURL=embed.service.js.map