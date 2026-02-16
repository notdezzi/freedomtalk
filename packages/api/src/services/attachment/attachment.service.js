import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ApiError, ApiErrorCode, ValidationError } from '../../types/api.types';
import { logger } from '../../config/logger';
import { VALIDATION } from '@freedomtalk/shared';
import { minioService } from '../storage/minio.service';
import sharp from 'sharp';
class AttachmentService {
    BUCKET_NAME = 'freedomtalk-attachments';
    THUMBNAIL_SIZE = 300;
    validateFile(file) {
        const errors = [];
        if (file.size > VALIDATION.ATTACHMENT.MAX_FILE_SIZE) {
            errors.push({
                field: 'size',
                message: `File size exceeds maximum of ${VALIDATION.ATTACHMENT.MAX_FILE_SIZE / 1024 / 1024}MB`,
            });
        }
        if (file.size <= 0) {
            errors.push({
                field: 'size',
                message: 'File size must be greater than 0',
            });
        }
        const allAllowedTypes = [
            ...VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES,
            ...VALIDATION.ATTACHMENT.ALLOWED_VIDEO_TYPES,
            ...VALIDATION.ATTACHMENT.ALLOWED_AUDIO_TYPES,
            ...VALIDATION.ATTACHMENT.ALLOWED_DOCUMENT_TYPES,
        ];
        if (!allAllowedTypes.includes(file.mimetype)) {
            errors.push({
                field: 'mimeType',
                message: `File type ${file.mimetype} is not allowed`,
            });
        }
        return errors;
    }
    async generateThumbnail(file, objectPath) {
        try {
            const isImage = VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES.includes(file.mimetype);
            if (!isImage) {
                return null;
            }
            const thumbnailBuffer = await sharp(file.buffer)
                .resize(this.THUMBNAIL_SIZE, this.THUMBNAIL_SIZE, {
                fit: 'inside',
                withoutEnlargement: true,
            })
                .webp({ quality: 80 })
                .toBuffer();
            const originalPath = objectPath.substring(0, objectPath.lastIndexOf('.'));
            const thumbnailPath = `${originalPath}_thumb.webp`;
            await minioService.uploadFile(this.BUCKET_NAME, thumbnailPath, thumbnailBuffer, thumbnailBuffer.length);
            logger.debug({ originalPath, thumbnailPath }, 'Thumbnail generated');
            return thumbnailPath;
        }
        catch (error) {
            logger.error({ error, objectPath }, 'Error generating thumbnail');
            return null;
        }
    }
    async getImageDimensions(file) {
        try {
            const isImage = VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES.includes(file.mimetype);
            const isVideo = VALIDATION.ATTACHMENT.ALLOWED_VIDEO_TYPES.includes(file.mimetype);
            if (!isImage && !isVideo) {
                return null;
            }
            if (isImage) {
                const metadata = await sharp(file.buffer).metadata();
                return {
                    width: metadata.width || 0,
                    height: metadata.height || 0,
                };
            }
            return null;
        }
        catch (error) {
            logger.error({ error, filename: file.originalname }, 'Error getting image dimensions');
            return null;
        }
    }
    generateObjectPath(userId, filename) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const extension = filename.split('.').pop();
        const sanitizedName = filename
            .substring(0, filename.lastIndexOf('.'))
            .replace(/[^a-zA-Z0-9._-]/g, '_');
        return `${userId}/${timestamp}_${random}_${sanitizedName}.${extension}`;
    }
    async uploadAttachment(file, userId, messageId) {
        try {
            const errors = this.validateFile(file);
            if (errors.length > 0) {
                throw new ValidationError('File validation failed', errors);
            }
            const objectPath = this.generateObjectPath(userId, file.originalname);
            await minioService.uploadFile(this.BUCKET_NAME, objectPath, file.buffer, file.size);
            const dimensions = await this.getImageDimensions(file);
            const thumbnailPath = await this.generateThumbnail(file, objectPath);
            const attachmentId = generateSnowflakeId();
            const now = new Date();
            const attachment = await db('message_attachments').insert({
                id: attachmentId,
                message_id: messageId,
                filename: file.originalname,
                size: file.size,
                mime_type: file.mimetype,
                object_path: objectPath,
                width: dimensions?.width || null,
                height: dimensions?.height || null,
                thumbnail_path: thumbnailPath,
                uploaded_by: userId,
                created_at: now,
            }).returning('*');
            const url = await minioService.getFileUrl(this.BUCKET_NAME, objectPath);
            logger.info({
                attachmentId,
                messageId,
                userId,
                filename: file.originalname,
                size: file.size,
            }, 'Attachment uploaded');
            return {
                attachment: attachment[0],
                url,
            };
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error({ error, messageId, userId }, 'Error uploading attachment');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to upload attachment', 500);
        }
    }
    async uploadAttachments(files, userId, messageId) {
        try {
            if (files.length > VALIDATION.ATTACHMENT.MAX_PER_MESSAGE) {
                throw new ValidationError(`Maximum ${VALIDATION.ATTACHMENT.MAX_PER_MESSAGE} attachments allowed per message`);
            }
            for (const file of files) {
                const errors = this.validateFile(file);
                if (errors.length > 0) {
                    throw new ValidationError(`File validation failed for ${file.originalname}`, errors);
                }
            }
            const uploadPromises = files.map(file => this.uploadAttachment(file, userId, messageId));
            const results = await Promise.all(uploadPromises);
            logger.info({
                messageId,
                userId,
                count: results.length,
            }, 'Multiple attachments uploaded');
            return results;
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error({ error, messageId, userId }, 'Error uploading multiple attachments');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to upload attachments', 500);
        }
    }
    async getAttachmentsByMessage(messageId) {
        try {
            const attachments = await db('message_attachments')
                .where({ message_id: messageId })
                .orderBy('created_at', 'asc');
            const attachmentsWithUrls = await Promise.all(attachments.map(async (attachment) => {
                const url = await minioService.getFileUrl(this.BUCKET_NAME, attachment.object_path);
                return {
                    ...attachment,
                    url,
                };
            }));
            return attachmentsWithUrls;
        }
        catch (error) {
            logger.error({ error, messageId }, 'Error fetching attachments');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch attachments', 500);
        }
    }
    async deleteAttachment(attachmentId, userId) {
        try {
            const attachment = await db('message_attachments')
                .where({ id: attachmentId })
                .first();
            if (!attachment) {
                throw new NotFoundError('Attachment');
            }
            if (attachment.uploaded_by !== userId) {
                throw new ValidationError('Not authorized to delete this attachment', []);
            }
            await minioService.deleteFile(this.BUCKET_NAME, attachment.object_path);
            if (attachment.thumbnail_path) {
                await minioService.deleteFile(this.BUCKET_NAME, attachment.thumbnail_path);
            }
            await db('message_attachments').where({ id: attachmentId }).delete();
            logger.info({ attachmentId, userId }, 'Attachment deleted');
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            logger.error({ error, attachmentId, userId }, 'Error deleting attachment');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete attachment', 500);
        }
    }
}
export const attachmentService = new AttachmentService();
//# sourceMappingURL=attachment.service.js.map