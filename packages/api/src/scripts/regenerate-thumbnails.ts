/**
 * Regenerate Thumbnails Script
 *
 * Finds image attachments without thumbnails and regenerates them.
 * Useful when thumbnail generation failed during upload or when
 * thumbnail settings have changed.
 *
 * Usage:
 *   npx tsx src/scripts/regenerate-thumbnails.ts [--dry-run] [--size=200]
 */

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

interface ThumbnailStats {
  totalImageAttachments: number;
  missingThumbnails: number;
  regenerated: number;
  skipped: number;
  errors: number;
}

async function regenerateThumbnails(): Promise<ThumbnailStats> {
  const stats: ThumbnailStats = {
    totalImageAttachments: 0,
    missingThumbnails: 0,
    regenerated: 0,
    skipped: 0,
    errors: 0,
  };

  logger.info(
    { dryRun: DRY_RUN, thumbnailSize: THUMBNAIL_SIZE },
    'Starting thumbnail regeneration'
  );

  try {
    // Ensure bucket exists
    await minioService.ensureBucket(BUCKET_NAME);

    // Find image attachments without thumbnails
    const imageAttachments = await db('message_attachments')
      .select(
        'id',
        'message_id',
        'filename',
        'size',
        'mime_type',
        'object_path',
        'thumbnail_path',
        'width',
        'height'
      )
      .whereIn('mime_type', IMAGE_MIME_TYPES)
      .orderBy('created_at', 'desc');

    stats.totalImageAttachments = imageAttachments.length;
    logger.info({ count: stats.totalImageAttachments }, 'Found image attachments');

    // Filter for missing thumbnails
    const needsThumbnail = imageAttachments.filter(
      (attachment) => !attachment.thumbnail_path
    );
    stats.missingThumbnails = needsThumbnail.length;

    logger.info({ count: stats.missingThumbnails }, 'Images missing thumbnails');

    // Process each attachment
    for (const attachment of needsThumbnail) {
      try {
        if (!attachment.object_path) {
          logger.warn(
            { attachmentId: attachment.id },
            'Attachment has no object_path, skipping'
          );
          stats.skipped++;
          continue;
        }

        if (DRY_RUN) {
          logger.info(
            {
              attachmentId: attachment.id,
              filename: attachment.filename,
              dryRun: true,
            },
            'Would regenerate thumbnail'
          );
          stats.regenerated++;
          continue;
        }

        // Download the original image from MinIO
        const minioClient = minioService.getClient();
        const imageStream = await minioClient.getObject(
          BUCKET_NAME,
          attachment.object_path
        );

        // Collect stream data into buffer
        const chunks: Buffer[] = [];
        for await (const chunk of imageStream) {
          chunks.push(chunk);
        }
        const imageBuffer = Buffer.concat(chunks);

        // Generate thumbnail using sharp
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer();

        // Generate thumbnail path
        const thumbnailPath = `thumbnails/${attachment.id}.webp`;

        // Upload thumbnail to MinIO using the service method
        await minioService.uploadFile(
          BUCKET_NAME,
          thumbnailPath,
          thumbnailBuffer,
          thumbnailBuffer.length,
          {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000',
          }
        );

        // Update database with thumbnail path
        await db('message_attachments')
          .where('id', attachment.id)
          .update({ thumbnail_path: thumbnailPath });

        logger.info(
          {
            attachmentId: attachment.id,
            filename: attachment.filename,
            thumbnailPath,
          },
          'Regenerated thumbnail'
        );

        stats.regenerated++;
      } catch (error) {
        logger.error(
          { error, attachmentId: attachment.id, filename: attachment.filename },
          'Failed to regenerate thumbnail'
        );
        stats.errors++;
      }
    }

    logger.info({ stats, dryRun: DRY_RUN }, 'Thumbnail regeneration completed');
    return stats;
  } catch (error) {
    logger.error({ error }, 'Thumbnail regeneration failed');
    throw error;
  }
}

// Run the script
regenerateThumbnails()
  .then((stats) => {
    console.log('\n=== Thumbnail Regeneration Summary ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`Thumbnail size: ${THUMBNAIL_SIZE}px`);
    console.log(`Total image attachments: ${stats.totalImageAttachments}`);
    console.log(`Images missing thumbnails: ${stats.missingThumbnails}`);
    console.log(
      `Thumbnails ${DRY_RUN ? 'would be ' : ''}regenerated: ${stats.regenerated}`
    );
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
