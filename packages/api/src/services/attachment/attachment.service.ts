/**
 * Attachment Service
 * Manages file attachments for messages including upload, validation, and thumbnail generation
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ApiError, ApiErrorCode, ValidationError } from '../../types/api.types';
import { logger } from '../../config/logger';
import { VALIDATION } from '@freedomtalk/shared';
import { minioService } from '../storage/minio.service';
import sharp from 'sharp';

/**
 * File interface for upload
 */
export interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Attachment data interface matching database schema
 */
export interface AttachmentData {
  id: string;
  message_id: string;
  filename: string;
  size: number;
  mime_type: string;
  object_path: string;
  width: number | null;
  height: number | null;
  thumbnail_path: string | null;
  uploaded_by: string;
  created_at: Date;
}

/**
 * Upload result interface
 */
export interface UploadResult {
  attachment: AttachmentData;
  url: string;
}

/**
 * Attachment dimensions interface
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Attachment Service class
 */
class AttachmentService {
  private readonly BUCKET_NAME = 'freedomtalk-attachments';
  private readonly THUMBNAIL_SIZE = 300; // Max 300x300 for thumbnails

  /**
   * Validate a file before upload
   * @param file - File to validate
   * @returns Validation errors array (empty if valid)
   */
  validateFile(file: UploadFile): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    // Check file size
    if (file.size > VALIDATION.ATTACHMENT.MAX_FILE_SIZE) {
      errors.push({
        field: 'size',
        message: `File size exceeds maximum of ${VALIDATION.ATTACHMENT.MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Check file size is positive
    if (file.size <= 0) {
      errors.push({
        field: 'size',
        message: 'File size must be greater than 0',
      });
    }

    // Check MIME type
    const allAllowedTypes = [
      ...VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES,
      ...VALIDATION.ATTACHMENT.ALLOWED_VIDEO_TYPES,
      ...VALIDATION.ATTACHMENT.ALLOWED_AUDIO_TYPES,
      ...VALIDATION.ATTACHMENT.ALLOWED_DOCUMENT_TYPES,
    ];

    if (!allAllowedTypes.includes(file.mimetype as any)) {
      errors.push({
        field: 'mimeType',
        message: `File type ${file.mimetype} is not allowed`,
      });
    }

    return errors;
  }

  /**
   * Generate thumbnail for an image
   * @param file - File buffer
   * @param objectPath - Object path for the original file
   * @returns Thumbnail path or null if not applicable
   */
  async generateThumbnail(file: UploadFile, objectPath: string): Promise<string | null> {
    try {
      // Only generate thumbnails for images
      const isImage = VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES.includes(
        file.mimetype as typeof VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES[number]
      );
      if (!isImage) {
        return null;
      }

      // Generate thumbnail using Sharp
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(this.THUMBNAIL_SIZE, this.THUMBNAIL_SIZE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Generate thumbnail path
      const originalPath = objectPath.substring(0, objectPath.lastIndexOf('.'));
      const thumbnailPath = `${originalPath}_thumb.webp`;

      // Upload thumbnail to MinIO
      await minioService.uploadFile(
        this.BUCKET_NAME,
        thumbnailPath,
        thumbnailBuffer,
        thumbnailBuffer.length
      );

      logger.debug({ originalPath, thumbnailPath }, 'Thumbnail generated');

      return thumbnailPath;
    } catch (error) {
      logger.error({ error, objectPath }, 'Error generating thumbnail');
      // Silently fail - thumbnails are optional
      return null;
    }
  }

  /**
   * Get image dimensions from file
   * @param file - File to analyze
   * @returns Image dimensions or null
   */
  async getImageDimensions(file: UploadFile): Promise<ImageDimensions | null> {
    try {
      // Only get dimensions for images and videos
      const isImage = VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES.includes(
        file.mimetype as typeof VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES[number]
      );
      const isVideo = VALIDATION.ATTACHMENT.ALLOWED_VIDEO_TYPES.includes(
        file.mimetype as typeof VALIDATION.ATTACHMENT.ALLOWED_VIDEO_TYPES[number]
      );

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

      // For videos, we'd need ffprobe - returning null for now
      return null;
    } catch (error) {
      logger.error({ error, filename: file.originalname }, 'Error getting image dimensions');
      return null;
    }
  }

  /**
   * Generate unique object path for a file
   * @param userId - User ID uploading the file
   * @param filename - Original filename
   * @returns Unique object path
   */
  generateObjectPath(userId: string, filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop();
    const sanitizedName = filename
      .substring(0, filename.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    return `${userId}/${timestamp}_${random}_${sanitizedName}.${extension}`;
  }

  /**
   * Upload a single attachment
   * @param file - File to upload
   * @param userId - User ID uploading the file
   * @param messageId - Message ID to attach to
   * @returns Upload result with attachment and URL
   */
  async uploadAttachment(
    file: UploadFile,
    userId: string,
    messageId: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const errors = this.validateFile(file);
      if (errors.length > 0) {
        throw new ValidationError('File validation failed', errors);
      }

      // Generate object path
      const objectPath = this.generateObjectPath(userId, file.originalname);

      // Upload file to MinIO
      await minioService.uploadFile(
        this.BUCKET_NAME,
        objectPath,
        file.buffer,
        file.size
      );

      // Get dimensions for images/videos
      const dimensions = await this.getImageDimensions(file);

      // Generate thumbnail for images
      const thumbnailPath = await this.generateThumbnail(file, objectPath);

      // Generate attachment ID
      const attachmentId = generateSnowflakeId();
      const now = new Date();

      // Insert attachment record
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

      // Generate presigned URL
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
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error({ error, messageId, userId }, 'Error uploading attachment');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to upload attachment', 500);
    }
  }

  /**
   * Upload multiple attachments in parallel
   * @param files - Array of files to upload
   * @param userId - User ID uploading the files
   * @param messageId - Message ID to attach to
   * @returns Array of upload results
   */
  async uploadAttachments(
    files: UploadFile[],
    userId: string,
    messageId: string
  ): Promise<UploadResult[]> {
    try {
      // Validate max attachments
      if (files.length > VALIDATION.ATTACHMENT.MAX_PER_MESSAGE) {
        throw new ValidationError(
          `Maximum ${VALIDATION.ATTACHMENT.MAX_PER_MESSAGE} attachments allowed per message`
        );
      }

      // Validate all files first
      for (const file of files) {
        const errors = this.validateFile(file);
        if (errors.length > 0) {
          throw new ValidationError(`File validation failed for ${file.originalname}`, errors);
        }
      }

      // Upload all files in parallel
      const uploadPromises = files.map(file =>
        this.uploadAttachment(file, userId, messageId)
      );

      const results = await Promise.all(uploadPromises);

      logger.info({
        messageId,
        userId,
        count: results.length,
      }, 'Multiple attachments uploaded');

      return results;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error({ error, messageId, userId }, 'Error uploading multiple attachments');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to upload attachments', 500);
    }
  }

  /**
   * Get all attachments for a message
   * @param messageId - Message ID
   * @returns Array of attachments with URLs
   */
  async getAttachmentsByMessage(messageId: string): Promise<AttachmentData[]> {
    try {
      const attachments = await db('message_attachments')
        .where({ message_id: messageId })
        .orderBy('created_at', 'asc');

      // Generate presigned URLs for all attachments
      const attachmentsWithUrls = await Promise.all(
        attachments.map(async (attachment) => {
          const url = await minioService.getFileUrl(
            this.BUCKET_NAME,
            attachment.object_path
          );
          return {
            ...attachment,
            url,
          };
        })
      );

      return attachmentsWithUrls;
    } catch (error) {
      logger.error({ error, messageId }, 'Error fetching attachments');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch attachments', 500);
    }
  }

  /**
   * Delete an attachment
   * @param attachmentId - Attachment ID
   * @param userId - User ID requesting deletion
   * @throws NotFoundError if attachment doesn't exist
   * @throws ValidationError if user is not the uploader
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    try {
      // Get attachment to verify ownership
      const attachment = await db('message_attachments')
        .where({ id: attachmentId })
        .first();

      if (!attachment) {
        throw new NotFoundError('Attachment');
      }

      // Check if user is the uploader
      if (attachment.uploaded_by !== userId) {
        throw new ValidationError('Not authorized to delete this attachment', []);
      }

      // Delete from MinIO
      await minioService.deleteFile(this.BUCKET_NAME, attachment.object_path);

      // Delete thumbnail if exists
      if (attachment.thumbnail_path) {
        await minioService.deleteFile(this.BUCKET_NAME, attachment.thumbnail_path);
      }

      // Delete from database
      await db('message_attachments').where({ id: attachmentId }).delete();

      logger.info({ attachmentId, userId }, 'Attachment deleted');
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error({ error, attachmentId, userId }, 'Error deleting attachment');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete attachment', 500);
    }
  }
}

// Export singleton instance
export const attachmentService = new AttachmentService();
