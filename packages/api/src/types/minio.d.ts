/**
 * Ambient type declarations for minio v8 (which no longer ships its own types).
 * Only the subset of the API used by this codebase is declared.
 */

declare module 'minio' {
  export interface ClientOptions {
    endPoint: string;
    port?: number;
    useSSL?: boolean;
    accessKey: string;
    secretKey: string;
    region?: string;
  }

  export interface UploadedObjectInfo {
    etag: string;
    versionId: string | null;
  }

  export class Client {
    constructor(options: ClientOptions);
    bucketExists(bucketName: string): Promise<boolean>;
    makeBucket(bucketName: string, region?: string): Promise<void>;
    putObject(
      bucketName: string,
      objectName: string,
      stream: NodeJS.ReadableStream | Buffer | string,
      size?: number,
      meta?: Record<string, string>,
    ): Promise<UploadedObjectInfo>;
    getObject(bucketName: string, objectName: string): Promise<import('stream').Readable>;
    listObjects(bucketName: string, prefix: string, recursive: boolean): import('stream').Readable;
    removeObject(bucketName: string, objectName: string): Promise<void>;
    presignedGetObject(bucketName: string, objectName: string, expiry?: number): Promise<string>;
  }
}
