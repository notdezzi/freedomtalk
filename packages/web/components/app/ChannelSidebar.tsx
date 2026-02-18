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
import { useServerStore } from '@/stores/serverStore';
import { useChannelStore, Channel, Category } from '@/stores/channelStore';
import { useUIStore } from '@/stores/uiStore';
import { useVoiceStore } from '@/stores/voiceStore';
import { VoiceChannelUsers, VoiceJoinButton } from '@/components/voice';

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

interface ChannelItemProps {
  channel: Channel;
  isSelected: boolean;
  onClick: () => void;
  onSettingsClick: () => void;
  serverId: string;
}

function ChannelItem({ channel, isSelected, onClick, onSettingsClick, serverId }: ChannelItemProps) {
  const hasUnread = channel.unreadCount && channel.unreadCount > 0;
  const { isConnected, currentChannelId, getUsersByChannel } = useVoiceStore();
  const voiceUsers = channel.type === 'voice' ? getUsersByChannel(channel.id) : [];
  const isInVoiceChannel = isConnected && currentChannelId === channel.id;

  // For voice channels, show users and join button
  if (channel.type === 'voice') {
    return (
      <div className="w-full">
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
        >
          <ChannelIcon type={channel.type} />
          <span className="truncate flex-1 text-left">{channel.name}</span>
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

        {/* Voice users in this channel */}
        {voiceUsers.length > 0 && (
          <VoiceChannelUsers channelId={channel.id} />
        )}

        {/* Join button if not connected */}
        {!isInVoiceChannel && (
          <VoiceJoinButton channelId={channel.id} serverId={serverId} />
        )}
      </div>
    );
  }

  // Text channels
  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onSettingsClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm group transition-colors cursor-pointer ${
        isSelected
          ? 'bg-accent-muted text-accent'
          : hasUnread
          ? 'text-foreground hover:bg-background-surface'
          : 'text-foreground-muted hover:bg-background-surface hover:text-foreground'
      }`}
      aria-current={isSelected ? 'page' : undefined}
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
}

function CategorySection({
  category,
  channels,
  currentChannelId,
  serverId,
  onChannelClick,
  onChannelSettings,
}: CategorySectionProps) {
  const { toggleCategoryCollapse } = useChannelStore();
  const { openCreateChannelModal } = useUIStore();

  if (channels.length === 0) return null;

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
        <div className="space-y-0.5">
          {channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isSelected={currentChannelId === channel.id}
              onClick={() => onChannelClick(channel)}
              onSettingsClick={() => onChannelSettings(channel)}
              serverId={serverId}
            />
          ))}
        </div>
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
      if (channel.type === 'text') {
        router.push(`/app/servers/${currentServerId}/channels/${channel.id}`);
      }
    },
    [setCurrentChannel, clearChannelUnread, router, currentServerId]
  );

  const handleChannelSettings = useCallback(
    (channel: Channel) => {
      openEditChannelModal({ channel });
    },
    [openEditChannelModal]
  );

  if (!isChannelSidebarOpen) return null;

  // No server selected - show DMs view
  if (!currentServerId) {
    return (
      <>
        {/* Header */}
        <div className="h-12 px-4 flex items-center border-b border-border shadow-md flex-shrink-0">
          <button className="flex items-center gap-2 w-full hover:text-accent transition-colors">
            <span className="font-semibold">Direct Messages</span>
          </button>
        </div>

        {/* DM content placeholder */}
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-foreground-muted text-center">
            Select a conversation or server to get started
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Server header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border shadow-md flex-shrink-0">
        <button
          onClick={() => openModal('server-settings')}
          className="flex items-center gap-2 w-full hover:text-accent transition-colors"
        >
          <span className="font-semibold truncate">{currentServer?.name || 'Server'}</span>
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        </button>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && channels.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Uncategorized channels */}
            {getChannelsForCategory(null).length > 0 && (
              <div className="space-y-0.5 mb-2">
                {getChannelsForCategory(null).map((channel) => (
                  <ChannelItem
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

            {/* Categories */}
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
