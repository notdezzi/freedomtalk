'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Hash,
  Volume2,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  User,
  FolderPlus,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useServerStore } from '@/stores/serverStore';
import { useChannelStore, Channel, Category } from '@/stores/channelStore';
import { useUIStore } from '@/stores/uiStore';
import { useVoiceStore } from '@/stores/voiceStore';
import { VoiceChannelUsers } from '@/components/voice';
import { apiClient } from '@/lib/api-client';

function ChannelIcon({ type }: { type: Channel['type'] }) {
  switch (type) {
    case 'voice':
      return <Volume2 className="w-4 h-4" />;
    case 'announcement':
      return <Megaphone className="w-4 h-4" />;
    default:
      return <Hash className="w-4 h-4" />;
  }
}

interface SortableChannelItemProps {
  channel: Channel;
  isSelected: boolean;
  onClick: () => void;
  onSettingsClick: () => void;
  serverId: string;
}

function SortableChannelItem({ channel, isSelected, onClick, onSettingsClick, serverId }: SortableChannelItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  const hasUnread = channel.unreadCount && channel.unreadCount > 0;
  const { isConnected, currentChannelId, getUsersByChannel } = useVoiceStore();
  const voiceUsers = channel.type === 'voice' ? getUsersByChannel(channel.id) : [];
  const isInVoiceChannel = isConnected && currentChannelId === channel.id;

  // For voice channels, show users - click navigates to voice view
  if (channel.type === 'voice') {
    return (
      <div ref={setNodeRef} style={style} className="w-full">
        <div
          onClick={onClick}
          onContextMenu={(e) => {
            e.preventDefault();
            onSettingsClick();
          }}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm group transition-colors cursor-pointer ${
            isInVoiceChannel
              ? 'bg-accent-muted text-accent'
              : 'text-foreground-muted hover:bg-background-surface hover:text-foreground'
          }`}
          {...attributes}
          {...listeners}
        >
          <ChannelIcon type={channel.type} />
          <span className="truncate flex-1 text-left">{channel.name}</span>
          {isInVoiceChannel && (
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          )}
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick();
              }}
              className="p-1 rounded hover:bg-background text-foreground-muted hover:text-foreground"
              aria-label="Channel settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voice users in this channel - avatar stack */}
        {voiceUsers.length > 0 && (
          <VoiceChannelUsers channelId={channel.id} />
        )}
      </div>
    );
  }

  // Text channels
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onSettingsClick();
      }}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm group transition-colors cursor-pointer ${
        isSelected
          ? 'bg-accent-muted text-accent'
          : hasUnread
          ? 'text-foreground hover:bg-background-surface'
          : 'text-foreground-muted hover:bg-background-surface hover:text-foreground'
      }`}
      aria-current={isSelected ? 'page' : undefined}
      {...attributes}
      {...listeners}
    >
      <ChannelIcon type={channel.type} />
      <span className="truncate flex-1 text-left">{channel.name}</span>
      {channel.unreadCount && channel.unreadCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-error text-xs text-white font-medium">
          {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
        </span>
      )}
      <div className="hidden group-hover:flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Open invite modal
          }}
          className="p-1 rounded hover:bg-background text-foreground-muted hover:text-foreground"
          aria-label="Create invite"
        >
          <User className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick();
          }}
          className="p-1 rounded hover:bg-background text-foreground-muted hover:text-foreground"
          aria-label="Channel settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: Category;
  channels: Channel[];
  currentChannelId: string | null;
  serverId: string;
  onChannelClick: (channel: Channel) => void;
  onChannelSettings: (channel: Channel) => void;
  onDragEnd: (event: DragEndEvent, categoryId: string) => void;
}

function CategorySection({
  category,
  channels,
  currentChannelId,
  serverId,
  onChannelClick,
  onChannelSettings,
  onDragEnd,
}: CategorySectionProps) {
  const { toggleCategoryCollapse } = useChannelStore();
  const { openCreateChannelModal } = useUIStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (channels.length === 0) return null;

  const channelIds = channels.map((c) => c.id);

  return (
    <div className="mb-2">
      <button
        onClick={() => toggleCategoryCollapse(category.id)}
        className="w-full flex items-center gap-1 px-1 py-1 text-xs font-semibold text-foreground-muted uppercase tracking-wide hover:text-foreground transition-colors"
        aria-expanded={!category.isCollapsed}
      >
        {category.isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        <span className="flex-1 text-left">{category.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openCreateChannelModal({ serverId, categoryId: category.id });
          }}
          className="p-0.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground"
          aria-label="Create channel"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </button>

      {!category.isCollapsed && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => onDragEnd(event, category.id)}
        >
          <SortableContext items={channelIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {channels.map((channel) => (
                <SortableChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={currentChannelId === channel.id}
                  onClick={() => onChannelClick(channel)}
                  onSettingsClick={() => onChannelSettings(channel)}
                  serverId={serverId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default function ChannelSidebar() {
  const router = useRouter();
  const { currentServerId, servers } = useServerStore();
  const { currentChannelId, setCurrentChannel, clearChannelUnread, getChannelsByServer, loading } =
    useChannelStore();
  const { isChannelSidebarOpen, openModal, openCreateChannelModal, openEditChannelModal, openCreateCategoryModal } = useUIStore();

  const currentServer = servers.find((s) => s.id === currentServerId);
  const isLoading = currentServerId ? loading[currentServerId] : false;

  // Get channels for current server
  const { channels, categories } = currentServerId
    ? getChannelsByServer(currentServerId)
    : { channels: [], categories: [] };

  // Group channels by category
  const getChannelsForCategory = (categoryId: string | null) =>
    channels.filter((ch) => ch.categoryId === categoryId).sort((a, b) => a.position - b.position);

  const handleChannelClick = useCallback(
    (channel: Channel) => {
      setCurrentChannel(channel.id);
      clearChannelUnread(channel.id);

      // Track last text channel for voice disconnect redirect
      if (channel.type !== 'voice') {
        useVoiceStore.getState().setLastTextChannel(channel.id, currentServerId);
      }

      // Navigate for both text and voice channels
      // Voice channels will render VoiceChannelView which handles joining
      router.push(`/app/servers/${currentServerId}/channels/${channel.id}`);
    },
    [setCurrentChannel, clearChannelUnread, router, currentServerId]
  );

  const handleChannelSettings = useCallback(
    (channel: Channel) => {
      openEditChannelModal({ channel });
    },
    [openEditChannelModal]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent, categoryId: string) => {
      const { active, over } = event;

      if (over && active.id !== over.id && currentServerId) {
        const categoryChannels = getChannelsForCategory(categoryId);
        const channelIds = categoryChannels.map((c) => c.id);
        const oldIndex = channelIds.indexOf(active.id as string);
        const newIndex = channelIds.indexOf(over.id as string);

        const newOrder = arrayMove(channelIds, oldIndex, newIndex);

        // Persist to backend
        try {
          const positions = newOrder.map((id, index) => ({
            id,
            position: index,
            categoryId: categoryId || null,
          }));
          await apiClient.updateChannelPositions(currentServerId, positions);
        } catch (error) {
          console.error('Failed to update channel positions:', error);
        }
      }
    },
    [currentServerId, channels]
  );

  if (!isChannelSidebarOpen) return null;

  // No server selected - show DMs view placeholder
  if (!currentServerId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-foreground-muted text-center">
          Select a conversation or server to get started
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Server header - click to open settings */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border flex-shrink-0">
        <button
          onClick={() => openModal('server-settings', { serverId: currentServerId })}
          className="flex items-center gap-2 w-full hover:text-accent transition-colors"
        >
          <span className="font-semibold truncate">{currentServer?.name || 'Server'}</span>
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        </button>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
        {isLoading && channels.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Uncategorized channels - not sortable for simplicity */}
            {getChannelsForCategory(null).length > 0 && (
              <div className="space-y-0.5 mb-2">
                {getChannelsForCategory(null).map((channel) => (
                  <SortableChannelItem
                    key={channel.id}
                    channel={channel}
                    isSelected={currentChannelId === channel.id}
                    onClick={() => handleChannelClick(channel)}
                    onSettingsClick={() => handleChannelSettings(channel)}
                    serverId={currentServerId}
                  />
                ))}
              </div>
            )}

            {/* Categories with sortable channels */}
            {categories
              .sort((a, b) => a.position - b.position)
              .map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  channels={getChannelsForCategory(category.id)}
                  currentChannelId={currentChannelId}
                  serverId={currentServerId}
                  onChannelClick={handleChannelClick}
                  onChannelSettings={handleChannelSettings}
                  onDragEnd={handleDragEnd}
                />
              ))}

            {/* Add channel/category buttons */}
            <div className="mt-2 pt-2 border-t border-border space-y-1">
              <button
                onClick={() => openCreateChannelModal({ serverId: currentServerId })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Channel</span>
              </button>
              <button
                onClick={() => openCreateCategoryModal({ serverId: currentServerId })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
