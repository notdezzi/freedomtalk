import { db } from '../config/database';
import { minioService } from '../services/storage/minio.service';
import { logger } from '../config/logger';
const BUCKET_NAME = process.env.MINIO_BUCKET || 'attachments';
const DRY_RUN = process.argv.includes('--dry-run');
async function cleanupOrphanedAttachments() {
    const stats = {
        totalMinioObjects: 0,
        totalDbAttachments: 0,
        orphanedObjects: 0,
        deletedObjects: 0,
        errors: 0,
    };
    logger.info({ dryRun: DRY_RUN }, 'Starting orphaned attachments cleanup');
    try {
        await minioService.ensureBucket(BUCKET_NAME);
        const dbAttachments = await db('message_attachments')
            .select('object_path', 'thumbnail_path')
            .whereNotNull('object_path');
        const dbPaths = new Set();
        for (const attachment of dbAttachments) {
            if (attachment.object_path) {
                dbPaths.add(attachment.object_path);
            }
            if (attachment.thumbnail_path) {
                dbPaths.add(attachment.thumbnail_path);
            }
        }
        stats.totalDbAttachments = dbPaths.size;
        logger.info({ count: stats.totalDbAttachments }, 'Found database attachment paths');
        const minioClient = minioService.getClient();
        const objects = [];
        await new Promise((resolve, reject) => {
            const stream = minioClient.listObjects(BUCKET_NAME, '', true);
            stream.on('data', (obj) => {
                objects.push(obj.name);
            });
            stream.on('error', (err) => {
                reject(err);
            });
            stream.on('end', () => {
                resolve();
            });
        });
        stats.totalMinioObjects = objects.length;
        logger.info({ count: stats.totalMinioObjects }, 'Found MinIO objects');
        const orphanedObjects = objects.filter((obj) => !dbPaths.has(obj));
        stats.orphanedObjects = orphanedObjects.length;
        logger.info({ count: stats.orphanedObjects }, 'Found orphaned objects');
        for (const objectPath of orphanedObjects) {
            try {
                if (DRY_RUN) {
                    logger.info({ objectPath, dryRun: true }, 'Would delete orphaned object');
                    stats.deletedObjects++;
                }
                else {
                    await minioService.deleteFile(BUCKET_NAME, objectPath);
                    logger.info({ objectPath }, 'Deleted orphaned object');
                    stats.deletedObjects++;
                }
            }
            catch (error) {
                logger.error({ error, objectPath }, 'Failed to delete orphaned object');
                stats.errors++;
            }
        }
        logger.info({ stats, dryRun: DRY_RUN }, 'Cleanup completed');
        return stats;
    }
    catch (error) {
        logger.error({ error }, 'Cleanup failed');
        throw error;
    }
}
cleanupOrphanedAttachments()
    .then((stats) => {
    console.log('\n=== Cleanup Summary ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`Total MinIO objects: ${stats.totalMinioObjects}`);
    console.log(`Total DB attachments: ${stats.totalDbAttachments}`);
    console.log(`Orphaned objects found: ${stats.orphanedObjects}`);
    console.log(`Objects ${DRY_RUN ? 'would be ' : ''}deleted: ${stats.deletedObjects}`);
    console.log(`Errors: ${stats.errors}`);
    process.exit(0);
})
    .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
});
//# sourceMappingURL=cleanup-orphaned-attachments.js.map