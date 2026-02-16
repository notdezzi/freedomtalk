import * as Minio from 'minio';
import { logger } from '../../config/logger';
import { ApiError, ApiErrorCode } from '../../types/api.types';
export class StorageError extends ApiError {
    constructor(message, statusCode = 500) {
        super(ApiErrorCode.STORAGE_ERROR, message, statusCode);
        this.name = 'StorageError';
    }
}
class MinIOService {
    client;
    endpoint;
    port;
    useSSL;
    constructor() {
        this.endpoint = process.env.MINIO_ENDPOINT || 'localhost';
        this.port = parseInt(process.env.MINIO_PORT || '9000', 10);
        this.useSSL = process.env.MINIO_USE_SSL === 'true';
        const accessKey = process.env.MINIO_ACCESS_KEY;
        const secretKey = process.env.MINIO_SECRET_KEY;
        if (!accessKey || !secretKey) {
            logger.error('MinIO credentials not configured');
            throw new StorageError('MinIO credentials not configured');
        }
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
    async ensureBucket(bucketName) {
        try {
            const exists = await this.client.bucketExists(bucketName);
            if (!exists) {
                await this.client.makeBucket(bucketName, 'us-east-1');
                logger.info({ bucketName }, 'MinIO bucket created');
            }
        }
        catch (error) {
            logger.error({ error, bucketName }, 'Error ensuring bucket exists');
            throw new StorageError(`Failed to ensure bucket exists: ${bucketName}`);
        }
    }
    async uploadFile(bucketName, objectName, stream, size, metadata) {
        try {
            await this.ensureBucket(bucketName);
            const result = await this.client.putObject(bucketName, objectName, stream, size, metadata);
            logger.info({ bucketName, objectName, size }, 'File uploaded to MinIO');
            return result;
        }
        catch (error) {
            logger.error({ error, bucketName, objectName }, 'Error uploading file to MinIO');
            throw new StorageError(`Failed to upload file: ${objectName}`);
        }
    }
    async downloadFile(bucketName, objectName) {
        try {
            const stream = await this.client.getObject(bucketName, objectName);
            logger.info({ bucketName, objectName }, 'File downloaded from MinIO');
            return stream;
        }
        catch (error) {
            logger.error({ error, bucketName, objectName }, 'Error downloading file from MinIO');
            throw new StorageError(`Failed to download file: ${objectName}`, 404);
        }
    }
    async deleteFile(bucketName, objectName) {
        try {
            await this.client.removeObject(bucketName, objectName);
            logger.info({ bucketName, objectName }, 'File deleted from MinIO');
        }
        catch (error) {
            logger.error({ error, bucketName, objectName }, 'Error deleting file from MinIO');
            throw new StorageError(`Failed to delete file: ${objectName}`);
        }
    }
    async getFileUrl(bucketName, objectName, expiry = 604800) {
        try {
            const url = await this.client.presignedGetObject(bucketName, objectName, expiry);
            logger.info({ bucketName, objectName, expiry }, 'Presigned URL generated');
            return url;
        }
        catch (error) {
            logger.error({ error, bucketName, objectName }, 'Error generating presigned URL');
            throw new StorageError(`Failed to generate URL for file: ${objectName}`);
        }
    }
    getClient() {
        return this.client;
    }
}
export const minioService = new MinIOService();
//# sourceMappingURL=minio.service.js.map