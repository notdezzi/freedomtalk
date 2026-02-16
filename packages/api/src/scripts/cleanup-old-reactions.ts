/**
 * Cleanup Old Reactions Script
 *
 * Optionally removes reactions older than a specified number of days.
 * Useful for reducing database size in high-traffic servers.
 *
 * Usage:
 *   npx tsx src/scripts/cleanup-old-reactions.ts [--dry-run] [--days=365] [--server-id=xxx]
 */

import { db } from '../config/database';
import { logger } from '../config/logger';

const DRY_RUN = process.argv.includes('--dry-run');
const DAYS_ARG = process.argv.find((arg) => arg.startsWith('--days='));
const DAYS_OLD = DAYS_ARG ? parseInt(DAYS_ARG.split('=')[1] || '365', 10) : 365;
const SERVER_ARG = process.argv.find((arg) => arg.startsWith('--server-id='));
const SERVER_ID = SERVER_ARG ? (SERVER_ARG.split('=')[1] || null) : null;

interface ReactionStats {
  totalReactions: number;
  oldReactions: number;
  deletedReactions: number;
  affectedMessages: number;
  errors: number;
}

async function cleanupOldReactions(): Promise<ReactionStats> {
  const stats: ReactionStats = {
    totalReactions: 0,
    oldReactions: 0,
    deletedReactions: 0,
    affectedMessages: 0,
    errors: 0,
  };

  logger.info(
    { dryRun: DRY_RUN, daysOld: DAYS_OLD, serverId: SERVER_ID },
    'Starting old reactions cleanup'
  );

  try {
    // Get total reactions count
    let totalQuery = db('message_reactions').count('id as count').first();

    if (SERVER_ID) {
      totalQuery = db('message_reactions as mr')
        .join('messages as m', 'mr.message_id', 'm.id')
        .join('channels as c', 'm.channel_id', 'c.id')
        .where('c.server_id', SERVER_ID)
        .count('mr.id as count')
        .first();
    }

    const totalCount = await totalQuery;
    stats.totalReactions = Number(totalCount?.count || 0);

    logger.info({ count: stats.totalReactions }, 'Total reactions');

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.setDate(cutoffDate.getDate() - DAYS_OLD));
    cutoffDate.setHours(0, 0, 0, 0);

    // Find old reactions
    let oldReactionsQuery = db('message_reactions')
      .select('id', 'message_id', 'emoji', 'created_at')
      .where('created_at', '<', cutoffDate);

    if (SERVER_ID) {
      oldReactionsQuery = db('message_reactions as mr')
        .select('mr.id', 'mr.message_id', 'mr.emoji', 'mr.created_at')
        .join('messages as m', 'mr.message_id', 'm.id')
        .join('channels as c', 'm.channel_id', 'c.id')
        .where('c.server_id', SERVER_ID)
        .where('mr.created_at', '<', cutoffDate);
    }

    const oldReactions = await oldReactionsQuery;
    stats.oldReactions = oldReactions.length;

    logger.info({ count: stats.oldReactions }, 'Found old reactions');

    if (oldReactions.length === 0) {
      logger.info('No old reactions to clean up');
      return stats;
    }

    // Get unique message IDs affected
    const affectedMessageIds = [...new Set(oldReactions.map((r) => r.message_id))];
    stats.affectedMessages = affectedMessageIds.length;

    if (DRY_RUN) {
      // In dry run, just report what would be deleted
      logger.info(
        {
          reactionsCount: oldReactions.length,
          messagesCount: affectedMessageIds.length,
          sampleReactions: oldReactions.slice(0, 5),
        },
        'Would delete old reactions (dry run)'
      );

      stats.deletedReactions = oldReactions.length;
    } else {
      // Delete old reactions in batches
      const BATCH_SIZE = 1000;
      const reactionIds = oldReactions.map((r) => r.id);

      for (let i = 0; i < reactionIds.length; i += BATCH_SIZE) {
        const batch = reactionIds.slice(i, i + BATCH_SIZE);

        try {
          const deleted = await db('message_reactions').whereIn('id', batch).del();
          stats.deletedReactions += deleted;

          logger.info(
            {
              batch: Math.floor(i / BATCH_SIZE) + 1,
              batchSize: batch.length,
              deleted,
              totalDeleted: stats.deletedReactions,
            },
            'Deleted batch of old reactions'
          );
        } catch (error) {
          logger.error(
            { error, batch: Math.floor(i / BATCH_SIZE) + 1 },
            'Failed to delete batch of reactions'
          );
          stats.errors++;
        }
      }
    }

    logger.info({ stats, dryRun: DRY_RUN }, 'Old reactions cleanup completed');
    return stats;
  } catch (error) {
    logger.error({ error }, 'Old reactions cleanup failed');
    throw error;
  }
}

// Run the script
cleanupOldReactions()
  .then((stats) => {
    console.log('\n=== Old Reactions Cleanup Summary ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`Minimum age: ${DAYS_OLD} days`);
    console.log(`Server filter: ${SERVER_ID || 'None (all servers)'}`);
    console.log(`Total reactions: ${stats.totalReactions}`);
    console.log(`Old reactions found: ${stats.oldReactions}`);
    console.log(
      `Reactions ${DRY_RUN ? 'would be ' : ''}deleted: ${stats.deletedReactions}`
    );
    console.log(`Affected messages: ${stats.affectedMessages}`);
    console.log(`Errors: ${stats.errors}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
