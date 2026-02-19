'use client';

import { cn } from '@/lib/utils';
import { Hash, Volume2, Folder, Unlock } from 'lucide-react';
import type { ChannelResponse } from '@/lib/api-client';

export interface ChannelListProps {
  /** All channels in the server */
  channels: ChannelResponse[];
  /** ID of the currently selected channel */
  selectedChannelId: string | null;
  /** Callback when a channel is selected */
  onSelectChannel: (channel: ChannelResponse) => void;
  /** Whether the list is loading */
  isLoading?: boolean;
  /** Whether the user has permission to manage channels */
  canManageChannels?: boolean;
}

/**
 * Channel icon component that renders the appropriate icon based on type.
 */
function ChannelIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'voice':
      return <Volume2 className={className} />;
    case 'category':
      return <Folder className={className} />;
    case 'text':
    default:
      return <Hash className={className} />;
  }
}

/**
 * Channel list component for displaying all channels in a server
 * with permission editing capabilities.
 */
export function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  isLoading = false,
  canManageChannels = false,
}: ChannelListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 bg-background-elevated rounded-md animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-foreground-subtle">
        <Hash className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No channels found</p>
      </div>
    );
  }

  // Separate categories and channels
  const categories = channels.filter((c) => c.type === 'category');
  const nonCategoryChannels = channels.filter((c) => c.type !== 'category');

  // Group channels by category
  const channelsByCategory = new Map<string | null, ChannelResponse[]>();
  categories.forEach((cat) => {
    channelsByCategory.set(cat.id, []);
  });
  channelsByCategory.set(null, []); // Uncategorized channels

  nonCategoryChannels.forEach((channel) => {
    const categoryChannels = channelsByCategory.get(channel.categoryId || null);
    if (categoryChannels) {
      categoryChannels.push(channel);
    } else {
      // Category doesn't exist, add to uncategorized
      const uncategorized = channelsByCategory.get(null);
      if (uncategorized) {
        uncategorized.push(channel);
      }
    }
  });

  // Sort by position
  const sortByPosition = (a: ChannelResponse, b: ChannelResponse) => a.position - b.position;

  return (
    <div className="space-y-0.5">
      {/* Render uncategorized channels first */}
      {(channelsByCategory.get(null) || []).sort(sortByPosition).map((channel) => (
        <ChannelItem
          key={channel.id}
          channel={channel}
          isSelected={selectedChannelId === channel.id}
          onClick={() => onSelectChannel(channel)}
          canManageChannels={canManageChannels}
        />
      ))}

      {/* Render categories with their channels */}
      {categories.sort(sortByPosition).map((category) => {
        const categoryChannels = channelsByCategory.get(category.id) || [];
        return (
          <div key={category.id}>
            {/* Category header */}
            <ChannelItem
              channel={category}
              isSelected={selectedChannelId === category.id}
              onClick={() => onSelectChannel(category)}
              canManageChannels={canManageChannels}
              isCategory
            />
            {/* Channels in category */}
            {categoryChannels.sort(sortByPosition).map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isSelected={selectedChannelId === channel.id}
                onClick={() => onSelectChannel(channel)}
                canManageChannels={canManageChannels}
                isNested
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

interface ChannelItemProps {
  channel: ChannelResponse;
  isSelected: boolean;
  onClick: () => void;
  canManageChannels: boolean;
  isCategory?: boolean;
  isNested?: boolean;
}

function ChannelItem({
  channel,
  isSelected,
  onClick,
  canManageChannels,
  isCategory = false,
  isNested = false,
}: ChannelItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
        'text-sm',
        isNested && 'pl-6',
        isCategory && 'font-semibold text-foreground-muted uppercase text-xs tracking-wide',
        isSelected
          ? 'bg-primary/20 text-primary'
          : 'text-foreground-muted hover:bg-background-surface hover:text-foreground',
        !canManageChannels && 'cursor-default'
      )}
    >
      <ChannelIcon
        type={channel.type}
        className={cn('h-4 w-4 flex-shrink-0', isCategory && 'h-3 w-3')}
      />
      <span className="truncate flex-1">{channel.name}</span>
      {/* Show sync status indicator - for now just a placeholder */}
      {channel.type !== 'category' && !isNested && (
        <Unlock className="h-3 w-3 text-foreground-subtle opacity-50" />
      )}
    </button>
  );
}
