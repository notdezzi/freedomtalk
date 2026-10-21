'use client';

import { cn } from '@/lib/utils';
import { type ReactNode, useState } from 'react';
import { ChevronDown, Hash, Volume2, VolumeX, Plus, MicOff, GripVertical } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Avatar } from '@/components/ui';
import type { ChannelType, DMChannel, VoiceUser } from '@/types';

// Local type for channel display (simplified for ChannelCategory)
type SimpleChannelType = 'text' | 'voice';
interface SimpleChannel {
  id: string;
  name: string;
  type: SimpleChannelType;
  hasNotification?: boolean;
}

export interface ItemListProps<T> {
  variant: 'channels' | 'dms' | 'members' | 'friends';
  items: T[];
  activeId?: string;
  groupBy?: keyof T;
  renderItem?: (item: T) => ReactNode;
  onItemClick: (item: T) => void;
  onItemContextMenu?: (e: React.MouseEvent, item: T) => void;
  headerComponent?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

export function ItemList<T extends { id: string; name?: string }>({
  variant,
  items,
  activeId,
  onItemClick,
  onItemContextMenu,
  headerComponent,
  emptyState,
  className,
}: ItemListProps<T>) {
  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      {/* Header */}
      {headerComponent && <div className="flex-shrink-0">{headerComponent}</div>}

      {/* Items */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {items.length === 0 ? (
          emptyState || (
            <div className="px-4 py-8 text-center text-sm text-foreground-subtle">
              Nothing here yet — it's quiet for now.
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
                onContextMenu={onItemContextMenu}
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
  onContextMenu,
  variant,
}: {
  item: T;
  isActive: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, item: T) => void;
  variant: string;
}) {
  // Get channel icon based on type
  const getChannelIcon = (type?: ChannelType) => {
    switch (type) {
      case 'voice':
        return <Volume2 className="h-4 w-4 text-foreground-muted" />;
      default:
        return <Hash className="h-4 w-4 text-foreground-muted" />;
    }
  };

  // Get item name
  const getName = () => {
    if ('name' in item && item.name) return item.name;
    if ('username' in item) return item.username as string;
    return 'Unnamed';
  };

  // Check if unread
  const isUnread = 'unread' in item && Boolean(item.unread);

  // Check if online (for DMs/members/friends)
  const isOnline = 'isOnline' in item && Boolean(item.isOnline);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      onContextMenu(e, item);
    }
  };

  return (
    <button
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className={cn(
        'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left',
        'transition-colors duration-100',
        isActive
          ? 'bg-background-hover text-foreground'
          : 'text-foreground-muted hover:bg-white/[0.04] hover:text-foreground',
        isUnread && 'text-foreground font-medium'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Channel icon for channels variant */}
      {variant === 'channels' && 'type' in item && getChannelIcon(item.type as ChannelType)}

      {/* Avatar for DMs/members/friends */}
      {(variant === 'dms' || variant === 'members' || variant === 'friends') && (
        <div className="relative">
          <div className="h-6 w-6 rounded-full bg-background-surface/80 flex items-center justify-center text-xs">
            {getName().charAt(0).toUpperCase()}
          </div>
          {/* Online indicator */}
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background-surface" />
          )}
        </div>
      )}

      {/* Name */}
      <span className="flex-1 truncate text-sm">{getName()}</span>

      {/* Unread indicator */}
      {isUnread && (
        <div className="h-2 w-2 rounded-full bg-foreground" />
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
  onChannelContextMenu,
  onAddClick,
  isCollapsed = false,
  onToggleCollapse,
  categoryId,
  voiceUsersByChannel,
  activeVoiceChannelId,
  isDraggable = false,
  isCategoryDraggable = false,
}: {
  name: string;
  channels: SimpleChannel[];
  activeChannelId?: string;
  onChannelClick: (channel: SimpleChannel) => void;
  onChannelContextMenu?: (e: React.MouseEvent, channel: SimpleChannel) => void;
  onAddClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  categoryId?: string;
  voiceUsersByChannel?: Record<string, VoiceUser[]>;
  activeVoiceChannelId?: string | null;
  isDraggable?: boolean;
  isCategoryDraggable?: boolean;
}) {
  const zoneId = `zone:${categoryId || 'uncategorized'}`;

  return (
    <div className="py-1">
      {/* Category header */}
      <div className="flex items-center group">
        <button
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          className={cn(
            'flex flex-1 min-w-0 items-center gap-1 px-1 py-0.5 text-xs font-semibold uppercase tracking-wide',
            'text-foreground-subtle hover:text-foreground transition-colors'
          )}
        >
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-200',
              isCollapsed && '-rotate-90'
            )}
          />
          <span className="flex-1 text-left truncate">{name}</span>
          {onAddClick && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Create channel"
              onClick={(e) => {
                e.stopPropagation();
                onAddClick();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddClick();
                }
              }}
              className="inline-flex items-center justify-center p-1.5 rounded hover:bg-background-surface hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Plus className="h-3 w-3" />
            </span>
          )}
        </button>
        {isCategoryDraggable && (
          <CategoryDragHandle categoryId={categoryId} name={name} />
        )}
      </div>

      {/* Channels */}
      {!isCollapsed && (
        <>
          <div className="mt-0.5 space-y-0.5">
            <SortableContext
              items={channels.map((channel) => `channel:${channel.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {channels.map((channel) => (
                <SortableChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannelId}
                  isDraggable={isDraggable}
                  onClick={() => onChannelClick(channel)}
                  onContextMenu={(e) => onChannelContextMenu?.(e, channel)}
                  voiceUsers={voiceUsersByChannel?.[channel.id]}
                  isActiveVoiceChannel={channel.id === activeVoiceChannelId}
                />
              ))}
            </SortableContext>
          </div>
          {/* Drop zone at end of category */}
          {isDraggable && <ChannelDropZone id={zoneId} enabled />}
        </>
      )}
    </div>
  );
}

/**
 * Drop target for "drop at end of list". Render inside the relevant
 * SortableContext area.
 */
export function ChannelDropZone({
  id,
  enabled = false,
}: {
  id: string;
  enabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !enabled });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-2 mx-1 rounded transition-colors',
        isOver && 'h-8 bg-background-surface/50 border-2 border-dashed border-foreground-subtle'
      )}
    />
  );
}

/**
 * Drag handle for reordering a category. Must be rendered inside the
 * categories SortableContext (see navigation-column).
 */
export function CategoryDragHandle({
  categoryId,
  name,
}: {
  categoryId?: string;
  name: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id: `category:${categoryId}`, disabled: !categoryId });

  return (
    <span
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Reorder category ${name}`}
      className={cn(
        'touch-none cursor-grab active:cursor-grabbing p-1.5 text-foreground-subtle hover:text-foreground flex-shrink-0',
        isDragging && 'opacity-50'
      )}
    >
      <GripVertical className="h-3 w-3" />
    </span>
  );
}

/**
 * Sortable channel row. Must be rendered inside the channels SortableContext
 * for its category (see navigation-column / ChannelCategory).
 */
export function SortableChannelItem({
  channel,
  isActive,
  isDraggable,
  onClick,
  onContextMenu,
  voiceUsers,
  isActiveVoiceChannel,
}: {
  channel: SimpleChannel;
  isActive: boolean;
  isDraggable?: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  voiceUsers?: VoiceUser[];
  isActiveVoiceChannel?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `channel:${channel.id}`,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('mx-1', isDragging && 'opacity-50')}
    >
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <ChannelItem
            channel={channel}
            isActive={isActive}
            onClick={onClick}
            onContextMenu={onContextMenu}
            voiceUsers={voiceUsers}
            isActiveVoiceChannel={isActiveVoiceChannel}
          />
        </div>
        {isDraggable && (
          <span
            {...attributes}
            {...listeners}
            aria-label={`Reorder channel ${channel.name}`}
            className="touch-none cursor-grab active:cursor-grabbing p-1.5 text-foreground-subtle hover:text-foreground flex-shrink-0"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

function ChannelItem({
  channel,
  isActive,
  onClick,
  onContextMenu,
  voiceUsers,
  isActiveVoiceChannel,
}: {
  channel: SimpleChannel;
  isActive: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  voiceUsers?: VoiceUser[];
  isActiveVoiceChannel?: boolean;
}) {
  const getIcon = () => {
    switch (channel.type) {
      case 'voice':
        return <Volume2 className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const isVoiceChannel = channel.type === 'voice';
  const hasVoiceUsers = voiceUsers && voiceUsers.length > 0;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent context menu from firing
    onContextMenu?.(e);
  };

  return (
    <div>
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left',
          'transition-colors duration-100 group',
          isActive
            ? 'bg-background-hover text-foreground'
            : 'text-foreground-muted hover:bg-white/[0.04] hover:text-foreground',
          channel.hasNotification && 'text-foreground font-medium',
          isActiveVoiceChannel && 'bg-success/20 text-success hover:bg-success/30'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {getIcon()}
        <span className="flex-1 truncate text-sm">{channel.name}</span>
      </button>
      {/* Show users in voice channel */}
      {isVoiceChannel && hasVoiceUsers && (
        <div className="ml-4 mr-2 mb-1 space-y-0.5">
          {voiceUsers.map((voiceUser) => (
            <div
              key={voiceUser.sessionId}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-0.5 text-xs text-foreground-muted hover:text-foreground",
                voiceUser.isSpeaking && "text-success"
              )}
            >
              <div className={cn(
                "relative",
                voiceUser.isSpeaking && "ring-2 ring-success rounded-full"
              )}>
                <Avatar
                  src={voiceUser.avatar}
                  alt={voiceUser.username}
                  size="xs"
                  isMuted={voiceUser.selfMute || voiceUser.selfDeaf}
                />
              </div>
              <span className="truncate">{voiceUser.username}</span>
              {voiceUser.selfDeaf && <VolumeX className="h-3 w-3 text-error" />}
              {!voiceUser.selfDeaf && voiceUser.selfMute && <MicOff className="h-3 w-3 text-error" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
