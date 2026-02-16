export interface UploadFile {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}
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
export interface UploadResult {
    attachment: AttachmentData;
    url: string;
}
export interface ImageDimensions {
    width: number;
    height: number;
}
declare class AttachmentService {
    private readonly BUCKET_NAME;
    private readonly THUMBNAIL_SIZE;
    validateFile(file: UploadFile): Array<{
        field: string;
        message: string;
    }>;
    generateThumbnail(file: UploadFile, objectPath: string): Promise<string | null>;
    getImageDimensions(file: UploadFile): Promise<ImageDimensions | null>;
    generateObjectPath(userId: string, filename: string): string;
    uploadAttachment(file: UploadFile, userId: string, messageId: string): Promise<UploadResult>;
    uploadAttachments(files: UploadFile[], userId: string, messageId: string): Promise<UploadResult[]>;
    getAttachmentsByMessage(messageId: string): Promise<AttachmentData[]>;
    deleteAttachment(attachmentId: string, userId: string): Promise<void>;
}
export declare const attachmentService: AttachmentService;
export {};
//# sourceMappingURL=attachment.service.d.ts.map