import { Readable } from 'stream';
import { ApiError } from '../../types/api.types';
export interface UploadResult {
    etag: string;
    versionId?: string | null;
}
export declare class StorageError extends ApiError {
    constructor(message: string, statusCode?: number);
}
export interface FileMetadata {
    [key: string]: string;
}
declare class MinIOService {
    private client;
    private endpoint;
    private port;
    private useSSL;
    constructor();
    ensureBucket(bucketName: string): Promise<void>;
    uploadFile(bucketName: string, objectName: string, stream: Readable | Buffer, size: number, metadata?: FileMetadata): Promise<UploadResult>;
    downloadFile(bucketName: string, objectName: string): Promise<Readable>;
    deleteFile(bucketName: string, objectName: string): Promise<void>;
    getFileUrl(bucketName: string, objectName: string, expiry?: number): Promise<string>;
}
export declare const minioService: MinIOService;
export {};
//# sourceMappingURL=minio.service.d.ts.map