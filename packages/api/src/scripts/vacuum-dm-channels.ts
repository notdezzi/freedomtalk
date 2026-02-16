/**
 * Vacuum DM Channels Script
 *
 * Finds and removes DM channels that have no active participants.
 * Useful for cleaning up abandoned DM channels.
 *
 * Usage:
 *   npx tsx src/scripts/vacuum-dm-channels.ts [--dry-run] [--days=30]
 */

import { db } from '../config/database';
import { logger } from '../config/logger';

const DRY_RUN = process.argv.includes('--dry-run');
const DAYS_ARG = process.argv.find((arg) => arg.startsWith('--days='));
const DAYS_OLD = DAYS_ARG ? parseInt(DAYS_ARG.split('=')[1] || '30', 10) : 30;

interface VacuumStats {
  totalDMChannels: number;
  inactiveChannels: number;
  deletedChannels: number;
  deletedParticipants: number;
  deletedMessages: number;
  errors: number;
}

async function vacuumDMChannels(): Promise<VacuumStats> {
  const stats: VacuumStats = {
    totalDMChannels: 0,
    inactiveChannels: 0,
    deletedChannels: 0,
    deletedParticipants: 0,
    deletedMessages: 0,
    errors: 0,
  };

  logger.info({ dryRun: DRY_RUN, daysOld: DAYS_OLD }, 'Starting DM channels vacuum');

  try {
    // Get total DM channels count
    const totalCount = await db('dm_channels').count('id as count').first();
    stats.totalDMChannels = Number(totalCount?.count || 0);

    logger.info({ count: stats.totalDMChannels }, 'Total DM channels');

    // Find channels with no active participants
    // A channel is inactive if:
    // 1. It has no participants at all
    // 2. All participants have is_active = false
    // 3. AND the channel is older than DAYS_OLD days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_OLD);

    const inactiveChannels = await db('dm_channels as dc')
      .select('dc.id', 'dc.type', 'dc.created_at')
      .leftJoin('dm_channel_participants as dcp', function () {
        this.on('dc.id', '=', 'dcp.dm_channel_id').andOn(
          'dcp.is_active',
          '=',
          db.raw('true')
        );
      })
      .where('dc.created_at', '<', cutoffDate)
      .groupBy('dc.id', 'dc.type', 'dc.created_at')
      .havingRaw('COUNT(dcp.id) = 0');

    stats.inactiveChannels = inactiveChannels.length;
    logger.info({ count: stats.inactiveChannels }, 'Found inactive DM channels');

    // Process each inactive channel
    for (const channel of inactiveChannels) {
      const trx = await db.transaction();

      try {
        if (DRY_RUN) {
          // In dry run, just count what would be deleted
          const participantCount = await trx('dm_channel_participants')
            .where('dm_channel_id', channel.id)
            .count('id as count')
            .first();

          const messageCount = await trx('messages')
            .where('channel_id', channel.id)
            .whereNotNull('dm_channel_id')
            .count('id as count')
            .first();

          stats.deletedParticipants += Number(participantCount?.count || 0);
          stats.deletedMessages += Number(messageCount?.count || 0);
          stats.deletedChannels++;

          logger.info(
            {
              channelId: channel.id,
              type: channel.type,
              participants: participantCount?.count,
              messages: messageCount?.count,
              dryRun: true,
            },
            'Would delete inactive DM channel'
          );
        } else {
          // Delete messages (cascade should handle this, but let's be explicit)
          const messageDeleteResult = await trx('messages')
            .where('channel_id', channel.id)
            .whereNotNull('dm_channel_id')
            .del();

          stats.deletedMessages += messageDeleteResult;

          // Delete all participants (including inactive ones)
          const participantDeleteResult = await trx('dm_channel_participants')
            .where('dm_channel_id', channel.id)
            .del();

          stats.deletedParticipants += participantDeleteResult;

          // Delete the channel
          await trx('dm_channels').where('id', channel.id).del();
          stats.deletedChannels++;

          logger.info(
            {
              channelId: channel.id,
              type: channel.type,
              participantsDeleted: participantDeleteResult,
              messagesDeleted: messageDeleteResult,
            },
            'Deleted inactive DM channel'
          );
        }

        await trx.commit();
      } catch (error) {
        await trx.rollback();
        logger.error({ error, channelId: channel.id }, 'Failed to process inactive DM channel');
        stats.errors++;
      }
    }

    logger.info({ stats, dryRun: DRY_RUN }, 'DM channels vacuum completed');
    return stats;
  } catch (error) {
    logger.error({ error }, 'DM channels vacuum failed');
    throw error;
  }
}

// Run the script
vacuumDMChannels()
  .then((stats) => {
    console.log('\n=== DM Channels Vacuum Summary ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`Minimum age: ${DAYS_OLD} days`);
    console.log(`Total DM channels: ${stats.totalDMChannels}`);
    console.log(`Inactive channels found: ${stats.inactiveChannels}`);
    console.log(`Channels ${DRY_RUN ? 'would be ' : ''}deleted: ${stats.deletedChannels}`);
    console.log(
      `Participants ${DRY_RUN ? 'would be ' : ''}deleted: ${stats.deletedParticipants}`
    );
    console.log(`Messages ${DRY_RUN ? 'would be ' : ''}deleted: ${stats.deletedMessages}`);
    console.log(`Errors: ${stats.errors}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
