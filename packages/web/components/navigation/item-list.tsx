'use client';

import { cn } from '@/lib/utils';
import { type ReactNode, useState } from 'react';
import { ChevronDown, Hash, Volume2, Plus } from 'lucide-react';
import type { Channel, ChannelType, DMChannel } from '@/types';

export interface ItemListProps<T> {
  variant: 'channels' | 'dms' | 'members' | 'friends';
  items: T[];
  activeId?: string;
  groupBy?: keyof T;
  renderItem?: (item: T) => ReactNode;
  onItemClick: (item: T) => void;
  headerComponent?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

export function ItemList<T extends { id: string; name?: string }>({
  variant,
  items,
  activeId,
  onItemClick,
  headerComponent,
  emptyState,
  className,
}: ItemListProps<T>) {
  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      {/* Header */}
      {headerComponent && <div className="flex-shrink-0">{headerComponent}</div>}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          emptyState || (
            <div className="flex items-center justify-center py-8 text-gray-500">
              No items
            </div>
          )
        ) : (
          <div className="space-y-0.5 px-2 py-1">
            {items.map((item) => (
              <ItemListItem
                key={item.id}
                item={item}
                isActive={item.id === activeId}
                onClick={() => onItemClick(item)}
                variant={variant}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemListItem<T extends { id: string; name?: string }>({
  item,
  isActive,
  onClick,
  variant,
}: {
  item: T;
  isActive: boolean;
  onClick: () => void;
  variant: string;
}) {
  // Get channel icon based on type
  const getChannelIcon = (type?: ChannelType) => {
    switch (type) {
      case 'voice':
        return <Volume2 className="h-4 w-4 text-gray-400" />;
      default:
        return <Hash className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get item name
  const getName = () => {
    if ('name' in item && item.name) return item.name;
    if ('username' in item) return item.username as string;
    return 'Unnamed';
  };

  // Check if unread
  const isUnread = 'unread' in item && item.unread;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left',
        'transition-colors duration-100',
        isActive
          ? 'bg-gray-600 text-white'
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200',
        isUnread && 'text-white font-medium'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Channel icon for channels variant */}
      {variant === 'channels' && 'type' in item && getChannelIcon(item.type as ChannelType)}

      {/* Avatar for DMs/members/friends */}
      {(variant === 'dms' || variant === 'members' || variant === 'friends') && (
        <div className="h-6 w-6 rounded-full bg-gray-600 flex items-center justify-center text-xs">
          {getName().charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name */}
      <span className="flex-1 truncate text-sm">{getName()}</span>

      {/* Unread indicator */}
      {isUnread && (
        <div className="h-2 w-2 rounded-full bg-white" />
      )}
    </button>
  );
}

// Channel Category Component
export function ChannelCategory({
  name,
  channels,
  activeChannelId,
  onChannelClick,
  onAddClick,
  isCollapsed = false,
  onToggleCollapse,
}: {
  name: string;
  channels: Channel[];
  activeChannelId?: string;
  onChannelClick: (channel: Channel) => void;
  onAddClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="py-1">
      {/* Category header */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          'flex w-full items-center gap-1 px-1 py-0.5 text-xs font-semibold uppercase tracking-wide',
          'text-gray-500 hover:text-gray-300 transition-colors'
        )}
      >
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isCollapsed && '-rotate-90'
          )}
        />
        <span className="flex-1 text-left">{name}</span>
        {onAddClick && (
          <Plus
            className="h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onAddClick();
            }}
          />
        )}
      </button>

      {/* Channels */}
      {!isCollapsed && (
        <div className="mt-0.5 space-y-0.5">
          {channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={channel.id === activeChannelId}
              onClick={() => onChannelClick(channel)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}) {
  const getIcon = () => {
    switch (channel.type) {
      case 'voice':
        return <Volume2 className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left',
        'transition-colors duration-100 group',
        isActive
          ? 'bg-gray-600 text-white'
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200',
        channel.hasNotification && 'text-white font-medium'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {getIcon()}
      <span className="flex-1 truncate text-sm">{channel.name}</span>
    </button>
  );
}
