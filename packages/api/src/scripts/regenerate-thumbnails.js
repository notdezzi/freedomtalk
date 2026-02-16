import { db } from '../config/database';
import { minioService } from '../services/storage/minio.service';
import { logger } from '../config/logger';
import sharp from 'sharp';
const BUCKET_NAME = process.env.MINIO_BUCKET || 'attachments';
const DRY_RUN = process.argv.includes('--dry-run');
const SIZE_ARG = process.argv.find((arg) => arg.startsWith('--size='));
const THUMBNAIL_SIZE = SIZE_ARG ? parseInt(SIZE_ARG.split('=')[1] || '200', 10) : 200;
const IMAGE_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
];
async function regenerateThumbnails() {
    const stats = {
        totalImageAttachments: 0,
        missingThumbnails: 0,
        regenerated: 0,
        skipped: 0,
        errors: 0,
    };
    logger.info({ dryRun: DRY_RUN, thumbnailSize: THUMBNAIL_SIZE }, 'Starting thumbnail regeneration');
    try {
        await minioService.ensureBucket(BUCKET_NAME);
        const imageAttachments = await db('message_attachments')
            .select('id', 'message_id', 'filename', 'size', 'mime_type', 'object_path', 'thumbnail_path', 'width', 'height')
            .whereIn('mime_type', IMAGE_MIME_TYPES)
            .orderBy('created_at', 'desc');
        stats.totalImageAttachments = imageAttachments.length;
        logger.info({ count: stats.totalImageAttachments }, 'Found image attachments');
        const needsThumbnail = imageAttachments.filter((attachment) => !attachment.thumbnail_path);
        stats.missingThumbnails = needsThumbnail.length;
        logger.info({ count: stats.missingThumbnails }, 'Images missing thumbnails');
        for (const attachment of needsThumbnail) {
            try {
                if (!attachment.object_path) {
                    logger.warn({ attachmentId: attachment.id }, 'Attachment has no object_path, skipping');
                    stats.skipped++;
                    continue;
                }
                if (DRY_RUN) {
                    logger.info({
                        attachmentId: attachment.id,
                        filename: attachment.filename,
                        dryRun: true,
                    }, 'Would regenerate thumbnail');
                    stats.regenerated++;
                    continue;
                }
                const minioClient = minioService.getClient();
                const imageStream = await minioClient.getObject(BUCKET_NAME, attachment.object_path);
                const chunks = [];
                for await (const chunk of imageStream) {
                    chunks.push(chunk);
                }
                const imageBuffer = Buffer.concat(chunks);
                const thumbnailBuffer = await sharp(imageBuffer)
                    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                    .webp({ quality: 80 })
                    .toBuffer();
                const thumbnailPath = `thumbnails/${attachment.id}.webp`;
                await minioService.uploadFile(BUCKET_NAME, thumbnailPath, thumbnailBuffer, thumbnailBuffer.length, {
                    'Content-Type': 'image/webp',
                    'Cache-Control': 'public, max-age=31536000',
                });
                await db('message_attachments')
                    .where('id', attachment.id)
                    .update({ thumbnail_path: thumbnailPath });
                logger.info({
                    attachmentId: attachment.id,
                    filename: attachment.filename,
                    thumbnailPath,
                }, 'Regenerated thumbnail');
                stats.regenerated++;
            }
            catch (error) {
                logger.error({ error, attachmentId: attachment.id, filename: attachment.filename }, 'Failed to regenerate thumbnail');
                stats.errors++;
            }
        }
        logger.info({ stats, dryRun: DRY_RUN }, 'Thumbnail regeneration completed');
        return stats;
    }
    catch (error) {
        logger.error({ error }, 'Thumbnail regeneration failed');
        throw error;
    }
}
regenerateThumbnails()
    .then((stats) => {
    console.log('\n=== Thumbnail Regeneration Summary ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`Thumbnail size: ${THUMBNAIL_SIZE}px`);
    console.log(`Total image attachments: ${stats.totalImageAttachments}`);
    console.log(`Images missing thumbnails: ${stats.missingThumbnails}`);
    console.log(`Thumbnails ${DRY_RUN ? 'would be ' : ''}regenerated: ${stats.regenerated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    process.exit(0);
})
    .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
});
//# sourceMappingURL=regenerate-thumbnails.js.map