/**
 * MinIO Storage Service
 * 
 * Provides object storage functionality using MinIO (S3-compatible).
 * Handles file upload, download, deletion, and URL generation.
 */

import * as Minio from 'minio';
import { Readable } from 'stream';
import { logger } from '../../config/logger';
import { ApiError, ApiErrorCode } from '../../types/api.types';

/**
 * Upload result interface
 */
export interface UploadResult {
  etag: string;
  versionId?: string | null;
}

/**
 * Storage error class for MinIO-specific errors
 */
export class StorageError extends ApiError {
  constructor(message: string, statusCode = 500) {
    super(ApiErrorCode.STORAGE_ERROR, message, statusCode);
    this.name = 'StorageError';
  }
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  [key: string]: string;
}

/**
 * MinIO storage service class
 */
class MinIOService {
  private client: Minio.Client;
  private endpoint: string;
  private port: number;
  private useSSL: boolean;

  constructor() {
    // Load configuration from environment variables
    this.endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    this.port = parseInt(process.env.MINIO_PORT || '9000', 10);
    this.useSSL = process.env.MINIO_USE_SSL === 'true';

    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;

    if (!accessKey || !secretKey) {
      logger.error('MinIO credentials not configured');
      throw new StorageError('MinIO credentials not configured');
    }

    // Initialize MinIO client
    this.client = new Minio.Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey,
      secretKey,
    });

    logger.info({
      endpoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
    }, 'MinIO storage service initialized');
  }

  /**
   * Ensure a bucket exists, create if it doesn't
   * @param bucketName - Name of the bucket
   * @throws StorageError if bucket creation fails
   */
  async ensureBucket(bucketName: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucketName);
      
      if (!exists) {
        await this.client.makeBucket(bucketName, 'us-east-1');
        logger.info({ bucketName }, 'MinIO bucket created');
      }
    } catch (error) {
      logger.error({ error, bucketName }, 'Error ensuring bucket exists');
      throw new StorageError(`Failed to ensure bucket exists: ${bucketName}`);
    }
  }

  /**
   * Upload a file to MinIO
   * @param bucketName - Name of the bucket
   * @param objectName - Name/path of the object in the bucket
   * @param stream - Readable stream of the file data
   * @param size - Size of the file in bytes
   * @param metadata - Optional metadata to attach to the file
   * @returns Object information
   * @throws StorageError if upload fails
   */
  async uploadFile(
    bucketName: string,
    objectName: string,
    stream: Readable | Buffer,
    size: number,
    metadata?: FileMetadata
  ): Promise<UploadResult> {
    try {
      await this.ensureBucket(bucketName);

      const result = await this.client.putObject(
        bucketName,
        objectName,
        stream,
        size,
        metadata
      );

      logger.info({ bucketName, objectName, size }, 'File uploaded to MinIO');
      return result;
    } catch (error) {
      logger.error({ error, bucketName, objectName }, 'Error uploading file to MinIO');
      throw new StorageError(`Failed to upload file: ${objectName}`);
    }
  }

  /**
   * Download a file from MinIO
   * @param bucketName - Name of the bucket
   * @param objectName - Name/path of the object in the bucket
   * @returns Readable stream of the file data
   * @throws StorageError if download fails
   */
  async downloadFile(bucketName: string, objectName: string): Promise<Readable> {
    try {
      const stream = await this.client.getObject(bucketName, objectName);
      logger.info({ bucketName, objectName }, 'File downloaded from MinIO');
      return stream;
    } catch (error) {
      logger.error({ error, bucketName, objectName }, 'Error downloading file from MinIO');
      throw new StorageError(`Failed to download file: ${objectName}`, 404);
    }
  }

  /**
   * Delete a file from MinIO
   * @param bucketName - Name of the bucket
   * @param objectName - Name/path of the object in the bucket
   * @throws StorageError if deletion fails
   */
  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    try {
      await this.client.removeObject(bucketName, objectName);
      logger.info({ bucketName, objectName }, 'File deleted from MinIO');
    } catch (error) {
      logger.error({ error, bucketName, objectName }, 'Error deleting file from MinIO');
      throw new StorageError(`Failed to delete file: ${objectName}`);
    }
  }

  /**
   * Get a presigned URL for accessing a file
   * @param bucketName - Name of the bucket
   * @param objectName - Name/path of the object in the bucket
   * @param expiry - URL expiry time in seconds (default: 7 days)
   * @returns Presigned URL
   * @throws StorageError if URL generation fails
   */
  async getFileUrl(bucketName: string, objectName: string, expiry = 604800): Promise<string> {
    try {
      const url = await this.client.presignedGetObject(bucketName, objectName, expiry);
      logger.info({ bucketName, objectName, expiry }, 'Presigned URL generated');
      return url;
    } catch (error) {
      logger.error({ error, bucketName, objectName }, 'Error generating presigned URL');
      throw new StorageError(`Failed to generate URL for file: ${objectName}`);
    }
  }
}

/**
 * MinIO storage service singleton
 * Use this instance throughout the application
 */
export const minioService = new MinIOService();

