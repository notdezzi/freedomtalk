'use client';

import { useState, useCallback } from 'react';
import { ChannelList, OverwriteEditor } from '../channel-permissions';
import { useServerChannels } from '@/features/servers';
import { useServerRoles } from '@/features/roles';
import { useCan } from '@/hooks';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';
import type { ChannelResponse } from '@/lib/api-client';
import { Hash, Lock } from 'lucide-react';

interface ChannelsTabProps {
  serverId: string;
}

/**
 * Channels tab for server settings.
 *
 * Displays a two-column layout:
 * - Left: List of channels with permission summary
 * - Right: Permission overwrite editor for selected channel
 *
 * Features:
 * - View all channels in the server
 * - Add/edit/delete permission overwrites per channel
 * - Search roles/members to add overwrites
 */
export function ChannelsTab({ serverId }: ChannelsTabProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null
  );

  // Queries
  const { data: channels = [], isLoading: isLoadingChannels } =
    useServerChannels(serverId);
  const { isLoading: isLoadingRoles } = useServerRoles(serverId);

  // Permission checks
  const canManageChannels = useCan(serverId, PERMISSION_FLAGS.MANAGE_CHANNELS);
  const canManageRoles = useCan(serverId, PERMISSION_FLAGS.MANAGE_ROLES);

  // Can edit overwrites if either permission is present
  const canEditOverwrites = canManageChannels || canManageRoles;

  // Find the selected channel
  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  // Handle channel selection
  const handleSelectChannel = useCallback((channel: ChannelResponse) => {
    setSelectedChannelId(channel.id);
  }, []);

  const isLoading = isLoadingChannels || isLoadingRoles;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Channels
        </h3>
        <p className="text-sm text-foreground-muted mt-1">
          Manage channel permissions and overwrites
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Channel list */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-background-surface rounded-lg border border-border">
          <div className="px-3 py-2 border-b border-border">
            <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Channels
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ChannelList
              channels={channels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={handleSelectChannel}
              isLoading={isLoading}
              canManageChannels={canEditOverwrites}
            />
          </div>
        </div>

        {/* Right: Edit panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChannel ? (
            <div className="flex-1 bg-background-surface rounded-lg border border-border p-4 overflow-y-auto">
              <OverwriteEditor
                channel={selectedChannel}
                serverId={serverId}
                canManageChannels={canEditOverwrites}
              />
            </div>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center bg-background-surface rounded-lg border border-border">
              <div className="text-center max-w-xs">
                <Lock className="h-12 w-12 mx-auto text-foreground-subtle mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  No Channel Selected
                </h4>
                <p className="text-sm text-foreground-muted mb-4">
                  Select a channel from the list to view and edit its permission
                  overwrites.
                </p>
                {!canEditOverwrites && (
                  <p className="text-xs text-foreground-subtle italic">
                    You need MANAGE_CHANNELS or MANAGE_ROLES permission to edit
                    overwrites.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission notice */}
      {!canEditOverwrites && (
        <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-sm text-warning">
            You do not have permission to edit channel permissions. You need
            MANAGE_CHANNELS or MANAGE_ROLES permission.
          </p>
        </div>
      )}
    </div>
  );
}
