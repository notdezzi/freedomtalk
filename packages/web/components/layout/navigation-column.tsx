'use client';

import { cn } from '@/lib/utils';
import { IconList, type IconItem } from '@/components/navigation/icon-list';
import { ItemList, ChannelCategory } from '@/components/navigation/item-list';
import { UserPanel } from './user-panel';
import { VoicePanel } from '@/components/voice';
import { useUIStore, useVoiceStore } from '@/stores';
import { ContextMenu, useContextMenu, Dropdown } from '@/components/ui';
import { Home, Plus, Users, Settings, UserPlus, LogOut, Trash2, Edit2, X, ChevronDown, FolderPlus, Hash, Volume2, VolumeX, GripVertical, MicOff } from 'lucide-react';
import { useServers, useServerChannelsAndCategories, useLeaveServer, useUpdateServerPositions, useUpdateChannelPositions } from '@/features/servers';
import { useDMChannels, useCloseDM } from '@/features/dms';
import { useAuthStore } from '@/stores';
import { useVoiceConnection, useServerVoiceStates } from '@/hooks';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useRef } from 'react';
import { Avatar } from '@/components/ui';

export function NavigationColumn() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const openModal = useUIStore((s) => s.openModal);

  // Get current user ID
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Voice connection
  const { joinChannel: joinVoiceChannel } = useVoiceConnection();
  const voiceStore = useVoiceStore();

  // Determine current context
  const serverId = params.serverId as string | undefined;
  const isHomePage = pathname === '/app';
  const isDMView = pathname.includes('/dms/');

  // Fetch voice states for all channels in the current server
  useServerVoiceStates(serverId);

  // Fetch data
  const { data: servers = [], isLoading: serversLoading } = useServers();
  const { data: serverData } = useServerChannelsAndCategories(serverId);
  const channels = serverData?.channels ?? [];
  const categories = serverData?.categories ?? [];
  const { data: dmChannels = [] } = useDMChannels();

  // Mutations
  const leaveServer = useLeaveServer();
  const closeDM = useCloseDM();
  const updateServerPositions = useUpdateServerPositions();
  const updateChannelPositions = useUpdateChannelPositions(serverId);

  // Drag and drop state for channels
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after'>('before');
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  // Category drag and drop state
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryIdForReorder, setDragOverCategoryIdForReorder] = useState<string | null>(null);

  // Context menus
  const serverContextMenu = useContextMenu();
  const channelContextMenu = useContextMenu();
  const channelListContextMenu = useContextMenu();
  const dmContextMenu = useContextMenu();

  // Determine active server/DM - only show server as active when actually viewing a server
  const activeServerId = isHomePage || isDMView ? undefined : (serverId || servers[0]?.id);
  const activeChannelId = params.channelId as string | undefined;
  const activeDMId = isDMView ? (params.channelId as string) : undefined;

  // Map servers to IconList items
  const serverItems = useMemo(() => {
    return servers.map((server) => ({
      id: server.id,
      name: server.name,
      acronym: server.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3),
      icon: server.iconUrl || (server as any).icon_url,
      color: '#5865F2',
      hasNotification: false,
    }));
  }, [servers]);

  // Map channels to ItemList items
  const channelItems = useMemo(() => {
    return channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type === 'voice' ? 'voice' as const : 'text' as const,
      unread: false,
    }));
  }, [channels]);

  // Map DMs to ItemList items (filter out current user)
  const dmItems = useMemo(() => {
    return dmChannels.map((dm) => {
      // Filter out current user to get the other person
      const recipient = dm.recipients?.find((r) => r.id !== currentUserId) || dm.recipients?.[0];
      return {
        id: dm.id,
        name: recipient?.displayName || recipient?.username || 'Unknown',
        type: 'dm' as const,
        avatar: recipient?.avatar,
        unread: false,
      };
    });
  }, [dmChannels, currentUserId]);

  const handleServerClick = (id: string) => {
    router.push(`/app/servers/${id}/channels/first`);
  };

  const handleServerReorder = (reorderedItems: IconItem[]) => {
    // Create positions array from the reordered items
    const positions = reorderedItems.map((item, index) => ({
      id: item.id,
      position: index,
    }));
    updateServerPositions.mutate(positions);
  };

  const handleChannelClick = (item: { id: string; type?: 'text' | 'voice' }) => {
    if (serverId) {
      // Check if this is a voice channel
      const channel = channels.find(c => c.id === item.id);
      if (channel?.type === 'voice') {
        // Join voice channel - don't navigate, just connect
        joinVoiceChannel(item.id);
      } else {
        // Text channel - navigate as usual
        router.push(`/app/servers/${serverId}/channels/${item.id}`);
      }
    }
  };

  // Get users in a voice channel (from channelStates which includes all users in server)
  const getUsersInVoiceChannel = (channelId: string) => {
    // Use channelStates (server-wide view) if available
    if (voiceStore.channelStates[channelId]) {
      return voiceStore.channelStates[channelId];
    }
    // Fall back to users (current channel only)
    return voiceStore.users.filter((u) => u.channelId === channelId);
  };

  // Check if current user is in a specific voice channel
  const isInVoiceChannel = (channelId: string) => {
    return voiceStore.isConnected && voiceStore.currentChannelId === channelId;
  };

  const handleDMClick = (item: { id: string }) => {
    router.push(`/app/dms/${item.id}`);
  };

  const handleHomeClick = () => {
    router.push('/app');
  };

  // Channel drag and drop handlers
  const handleChannelDragStart = (e: React.DragEvent, channelId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedChannelId(channelId);
  };

  const handleChannelDragEnd = () => {
    setDraggedChannelId(null);
    setDragOverChannelId(null);
    setDragOverPosition('before');
    setDragOverCategoryId(null);
    setDraggedCategoryId(null);
    setDragOverCategoryIdForReorder(null);
  };

  const handleChannelDragOver = (e: React.DragEvent, channelId: string, categoryId?: string) => {
    e.preventDefault();
    if (draggedChannelId && draggedChannelId !== channelId) {
      setDragOverChannelId(channelId);
      setDragOverCategoryId(categoryId || null);
      // Determine if mouse is in top or bottom half of the element
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setDragOverPosition(e.clientY < midY ? 'before' : 'after');
    }
  };

  const handleChannelDragLeave = () => {
    setDragOverChannelId(null);
    setDragOverCategoryId(null);
  };

  // Handle drag over empty space at bottom of category (to allow dropping at end)
  const handleCategoryDropZoneDragOver = (e: React.DragEvent, categoryId: string | null) => {
    e.preventDefault();
    if (draggedChannelId) {
      setDragOverChannelId(null);
      setDragOverCategoryId(categoryId);
      setDragOverPosition('after');
    }
  };

  const handleCategoryDropZoneDrop = (e: React.DragEvent, categoryId: string | null) => {
    e.preventDefault();
    if (!draggedChannelId) return;

    // Check if user has permission (is owner)
    const serverData = servers.find(s => s.id === serverId);
    const isOwner = (serverData?.ownerId || (serverData as any)?.owner_id) === currentUserId;
    if (!isOwner) return;

    // Get channels in this category, sorted by position
    const categoryChannels = channels
      .filter(c => (c.categoryId || null) === categoryId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Add the dragged channel at the end
    const positions = categoryChannels.map((c, i) => ({
      id: c.id,
      position: i,
      categoryId: categoryId,
    }));

    // Add dragged channel at the end
    positions.push({
      id: draggedChannelId,
      position: categoryChannels.length,
      categoryId: categoryId,
    });

    updateChannelPositions.mutate(positions);
    handleChannelDragEnd();
  };

  const handleChannelDrop = (e: React.DragEvent, targetChannelId: string, targetCategoryId?: string) => {
    e.preventDefault();
    if (!draggedChannelId || draggedChannelId === targetChannelId) {
      handleChannelDragEnd();
      return;
    }

    // Check if user has permission (is owner)
    const serverData = servers.find(s => s.id === serverId);
    const isOwner = (serverData?.ownerId || (serverData as any)?.owner_id) === currentUserId;
    if (!isOwner) return;

    // Get all channels in the same category as the target
    const targetChannel = channels.find(c => c.id === targetChannelId);
    const categoryId = targetChannel?.categoryId || targetCategoryId || null;

    // Get channels in the same category, sorted by position
    const categoryChannels = channels
      .filter(c => (c.categoryId || null) === categoryId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Get target index based on drop position
    const targetIndex = categoryChannels.findIndex(c => c.id === targetChannelId);
    const insertIndex = dragOverPosition === 'before' ? targetIndex : targetIndex + 1;

    // Check if dragged channel is from same category
    const draggedChannel = channels.find(c => c.id === draggedChannelId);
    const isFromSameCategory = (draggedChannel?.categoryId || null) === categoryId;

    let positions;

    if (isFromSameCategory) {
      // Reorder within same category
      const draggedIndex = categoryChannels.findIndex(c => c.id === draggedChannelId);
      const newOrder = [...categoryChannels];
      const [draggedItem] = newOrder.splice(draggedIndex, 1);

      // Adjust insert index if dragging from above
      const adjustedIndex = draggedIndex < insertIndex ? insertIndex - 1 : insertIndex;
      newOrder.splice(adjustedIndex, 0, draggedItem);

      positions = newOrder.map((c, i) => ({
        id: c.id,
        position: i,
        categoryId: categoryId,
      }));
    } else {
      // Moving from different category
      positions = categoryChannels.map((c, i) => ({
        id: c.id,
        position: i,
        categoryId: categoryId,
      }));

      // Insert at the target position
      positions.splice(insertIndex, 0, {
        id: draggedChannelId,
        position: insertIndex,
        categoryId: categoryId,
      });

      // Re-index
      positions = positions.map((p, i) => ({ ...p, position: i }));
    }

    updateChannelPositions.mutate(positions);
    handleChannelDragEnd();
  };

  // Category drag and drop handlers
  const handleCategoryDragStart = (e: React.DragEvent, categoryId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
    setDraggedCategoryId(categoryId);
  };

  const handleCategoryDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    if (draggedCategoryId && draggedCategoryId !== categoryId) {
      setDragOverCategoryIdForReorder(categoryId);
    }
  };

  const handleCategoryDragLeave = () => {
    setDragOverCategoryIdForReorder(null);
  };

  const handleCategoryDrop = (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) {
      handleChannelDragEnd();
      return;
    }

    // Check if user has permission (is owner)
    const serverData = servers.find(s => s.id === serverId);
    const isOwner = (serverData?.ownerId || (serverData as any)?.owner_id) === currentUserId;
    if (!isOwner) return;

    // Reorder categories
    const sortedCategories = [...categories].sort((a, b) => (a.position || 0) - (b.position || 0));
    const draggedIndex = sortedCategories.findIndex(c => c.id === draggedCategoryId);
    const targetIndex = sortedCategories.findIndex(c => c.id === targetCategoryId);

    const newOrder = [...sortedCategories];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    // For now, we'll need to add a category positions update API
    // For simplicity, let's just update via the channel positions API for now
    // This is a placeholder - proper implementation would need a category positions endpoint
    console.log('Category reorder not fully implemented yet');

    handleChannelDragEnd();
  };

  // Server context menu
  const handleServerContextMenu = (e: React.MouseEvent, item: IconItem) => {
    serverContextMenu.openContextMenu(e, item);
  };

  const getServerContextMenuItems = (contextServerId?: string) => {
    const targetServerId = contextServerId || (serverContextMenu.contextMenu?.data as IconItem | undefined)?.id;
    if (!targetServerId) return [];

    // Check for both camelCase and snake_case since API might return either
    const serverData = servers.find(s => s.id === targetServerId);
    const isOwner = (serverData?.ownerId || (serverData as any)?.owner_id) === currentUserId;

    return [
      {
        label: 'Invite People',
        icon: <UserPlus className="h-4 w-4" />,
        onClick: () => openModal('invite-people', { serverId: targetServerId }),
      },
      ...(isOwner
        ? [
            {
              label: 'Server Settings',
              icon: <Settings className="h-4 w-4" />,
              onClick: () => openModal('server-settings', { serverId: targetServerId }),
            },
          ]
        : []),
      { label: 'divider', onClick: () => {}, divider: true },
      ...(isOwner
        ? [
            {
              label: 'Delete Server',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => openModal('delete-server', { serverId: targetServerId }),
              danger: true,
            },
          ]
        : [
            {
              label: 'Leave Server',
              icon: <LogOut className="h-4 w-4" />,
              onClick: () => {
                leaveServer.mutate(targetServerId, {
                  onSuccess: () => {
                    if (serverId === targetServerId) {
                      router.push('/app');
                    }
                  },
                });
              },
              danger: true,
            },
          ]),
    ];
  };

  // Channel context menu
  const handleChannelContextMenu = (e: React.MouseEvent, item: { id: string; name?: string }) => {
    channelContextMenu.openContextMenu(e, item);
  };

  const getChannelContextMenuItems = () => {
    const channel = channelContextMenu.contextMenu?.data as { id: string; name?: string } | undefined;
    if (!channel || !serverId) return [];

    // Check if user can manage channels (simplified - in real app, check permissions)
    const serverData = servers.find(s => s.id === serverId);
    const isOwner = (serverData?.ownerId || (serverData as any)?.owner_id) === currentUserId;

    if (!isOwner) return [];

    return [
      {
        label: 'Edit Channel',
        icon: <Edit2 className="h-4 w-4" />,
        onClick: () => openModal('edit-channel', { serverId, channelId: channel.id }),
      },
      {
        label: 'Delete Channel',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: () => openModal('delete-channel', { serverId, channelId: channel.id }),
        danger: true,
      },
    ];
  };

  // Channel list context menu (for creating channels/categories)
  const handleChannelListContextMenu = (e: React.MouseEvent) => {
    if (!serverId) return;

    // Check if user can manage channels
    const serverData = servers.find(s => s.id === serverId);
    const isOwner = (serverData?.ownerId || (serverData as any)?.owner_id) === currentUserId;

    if (!isOwner) return;

    channelListContextMenu.openContextMenu(e, { serverId });
  };

  const getChannelListContextMenuItems = () => {
    const data = channelListContextMenu.contextMenu?.data as { serverId: string } | undefined;
    if (!data?.serverId) return [];

    return [
      {
        label: 'Create Channel',
        icon: <Hash className="h-4 w-4" />,
        onClick: () => openModal('create-channel', { serverId: data.serverId }),
      },
      {
        label: 'Create Category',
        icon: <FolderPlus className="h-4 w-4" />,
        onClick: () => openModal('create-category', { serverId: data.serverId }),
      },
    ];
  };

  // Server dropdown menu (for server header)
  const getServerDropdownItems = () => {
    if (!serverId) return [];

    const serverData = servers.find(s => s.id === serverId);
    const isOwner = (serverData?.ownerId || (serverData as any)?.owner_id) === currentUserId;

    return [
      {
        id: 'invite',
        label: 'Invite People',
        icon: <UserPlus className="h-4 w-4" />,
        onClick: () => openModal('invite-people', { serverId }),
      },
      ...(isOwner
        ? [
            {
              id: 'settings',
              label: 'Server Settings',
              icon: <Settings className="h-4 w-4" />,
              onClick: () => openModal('server-settings', { serverId }),
            },
            {
              id: 'create-channel',
              label: 'Create Channel',
              icon: <Hash className="h-4 w-4" />,
              onClick: () => openModal('create-channel', { serverId }),
            },
            {
              id: 'create-category',
              label: 'Create Category',
              icon: <FolderPlus className="h-4 w-4" />,
              onClick: () => openModal('create-category', { serverId }),
            },
          ]
        : []),
    ];
  };

  // DM context menu
  const handleDMContextMenu = (e: React.MouseEvent, item: { id: string; name?: string }) => {
    dmContextMenu.openContextMenu(e, item);
  };

  const getDMContextMenuItems = () => {
    const dm = dmContextMenu.contextMenu?.data as { id: string; name?: string } | undefined;
    if (!dm) return [];

    return [
      {
        label: 'Close DM',
        icon: <X className="h-4 w-4" />,
        onClick: () => {
          closeDM.mutate(dm.id, {
            onSuccess: () => {
              if (activeDMId === dm.id) {
                router.push('/app');
              }
            },
          });
        },
      },
      {
        label: 'View Profile',
        icon: <Users className="h-4 w-4" />,
        onClick: () => openModal('user-profile', { dmId: dm.id }),
      },
    ];
  };

  // Determine what to show in the channel list area
  const renderChannelList = () => {
    if (isHomePage || isDMView) {
      // Home page or DM view - show friends/DMs
      return (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Friends section */}
          <div className="px-3 py-2">
            <button
              onClick={() => router.push('/app')}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left',
                'transition-colors duration-100',
                isHomePage ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Friends</span>
            </button>
          </div>

          {/* DM list */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
              <span>Direct Messages</span>
              <button
                onClick={() => openModal('add-friend')}
                className="rounded p-1 hover:bg-gray-700"
                aria-label="Add friend"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <ItemList
              variant="dms"
              items={dmItems}
              activeId={activeDMId}
              onItemClick={handleDMClick}
              onItemContextMenu={handleDMContextMenu}
            />
          </div>
        </div>
      );
    }

    if (serverId) {
      // Server view - show server header and channel list
      const currentServer = servers.find(s => s.id === serverId);
      const serverData = servers.find(s => s.id === serverId);
      const isOwner = (serverData?.ownerId || (serverData as any)?.owner_id) === currentUserId;

      return (
        <div
          className="flex flex-1 flex-col overflow-hidden"
          onContextMenu={handleChannelListContextMenu}
        >
          {/* Server Header */}
          <Dropdown
            trigger={
              <button
                className="flex items-center justify-between w-full px-3 py-3 border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
              >
                <span className="font-semibold text-white truncate">
                  {currentServer?.name || 'Server'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </button>
            }
            items={getServerDropdownItems()}
            align="start"
          />

          {/* Channel List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {/* Uncategorised channels (no categoryId) */}
            {channelItems.filter(ch => {
              const channel = channels.find(c => c.id === ch.id);
              return !channel?.categoryId;
            }).length > 0 && (
              <div className="py-1">
                {channelItems
                  .filter(ch => {
                    const channel = channels.find(c => c.id === ch.id);
                    return !channel?.categoryId;
                  })
                  .sort((a, b) => {
                    const chA = channels.find(c => c.id === a.id);
                    const chB = channels.find(c => c.id === b.id);
                    return (chA?.position || 0) - (chB?.position || 0);
                  })
                  .map((item) => {
                    const voiceUsers = item.type === 'voice' ? getUsersInVoiceChannel(item.id) : [];
                    const isActiveVoiceChannel = item.type === 'voice' && isInVoiceChannel(item.id);

                    return (
                    <div
                      key={item.id}
                      draggable={isOwner}
                      onDragStart={(e) => handleChannelDragStart(e, item.id)}
                      onDragEnd={handleChannelDragEnd}
                      onDragOver={(e) => handleChannelDragOver(e, item.id, undefined)}
                      onDragLeave={handleChannelDragLeave}
                      onDrop={(e) => handleChannelDrop(e, item.id, undefined)}
                      className={cn(
                        'relative mx-1',
                        dragOverChannelId === item.id && dragOverPosition === 'before' && 'border-t-2 border-white',
                        dragOverChannelId === item.id && dragOverPosition === 'after' && 'border-b-2 border-white'
                      )}
                    >
                      <button
                        onClick={() => handleChannelClick({ id: item.id, type: item.type })}
                        onContextMenu={(e) => handleChannelContextMenu(e, { id: item.id, name: item.name })}
                        className={cn(
                          'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left',
                          'transition-colors duration-100',
                          item.id === activeChannelId
                            ? 'bg-gray-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200',
                          draggedChannelId === item.id && 'opacity-50',
                          isOwner && 'cursor-grab',
                          isActiveVoiceChannel && 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        )}
                      >
                        {item.type === 'voice' ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <Hash className="h-4 w-4" />
                        )}
                        <span className="flex-1 truncate text-sm">{item.name}</span>
                        {isOwner && (
                          <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                        )}
                      </button>
                      {/* Show users in voice channel */}
                      {item.type === 'voice' && voiceUsers.length > 0 && (
                        <div className="ml-4 mr-2 mb-1 space-y-0.5">
                          {voiceUsers.map((voiceUser) => (
                            <div
                              key={voiceUser.sessionId}
                              className={cn(
                                "flex items-center gap-1.5 rounded px-2 py-0.5 text-xs text-gray-400 hover:text-gray-300",
                                voiceUser.isSpeaking && "text-green-400"
                              )}
                            >
                              <div className={cn(
                                "relative",
                                voiceUser.isSpeaking && "ring-2 ring-green-500 rounded-full"
                              )}>
                                <Avatar
                                  src={voiceUser.avatar}
                                  alt={voiceUser.username}
                                  size="xs"
                                  isMuted={voiceUser.selfMute || voiceUser.selfDeaf}
                                />
                              </div>
                              <span className="truncate">{voiceUser.username}</span>
                              {voiceUser.selfDeaf && <VolumeX className="h-3 w-3 text-red-400" />}
                              {!voiceUser.selfDeaf && voiceUser.selfMute && <MicOff className="h-3 w-3 text-red-400" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                  })}
                {/* Drop zone at end of uncategorized channels */}
                {draggedChannelId && (
                  <div
                    onDragOver={(e) => handleCategoryDropZoneDragOver(e, null)}
                    onDrop={(e) => handleCategoryDropZoneDrop(e, null)}
                    className={cn(
                      'h-8 mx-1 rounded transition-colors',
                      dragOverCategoryId === null && !dragOverChannelId && 'bg-gray-700/50 border-2 border-dashed border-gray-500'
                    )}
                  />
                )}
              </div>
            )}

            {/* Categories with their channels */}
            {categories
              .sort((a, b) => (a.position || 0) - (b.position || 0))
              .map((category) => {
                const categoryChannels = channelItems.filter(ch => {
                  const channel = channels.find(c => c.id === ch.id);
                  return channel?.categoryId === category.id;
                });

                // Sort channels by position
                const sortedChannels = categoryChannels
                  .map(item => {
                    const channel = channels.find(c => c.id === item.id);
                    return { ...item, position: channel?.position || 0 };
                  })
                  .sort((a, b) => a.position - b.position);

                // Build voice users map for this category's channels
                const voiceUsersMap: Record<string, typeof voiceStore.users> = {};
                sortedChannels.forEach(item => {
                  if (item.type === 'voice') {
                    voiceUsersMap[item.id] = getUsersInVoiceChannel(item.id);
                  }
                });

                return (
                  <div
                    key={category.id}
                    draggable={isOwner}
                    onDragStart={(e) => handleCategoryDragStart(e, category.id)}
                    onDragEnd={handleChannelDragEnd}
                    onDragOver={(e) => handleCategoryDragOver(e, category.id)}
                    onDragLeave={handleCategoryDragLeave}
                    onDrop={(e) => handleCategoryDrop(e, category.id)}
                    className={cn(
                      draggedCategoryId === category.id && 'opacity-50',
                      dragOverCategoryIdForReorder === category.id && 'border-t-2 border-white'
                    )}
                  >
                    <ChannelCategory
                      name={category.name}
                      channels={sortedChannels.map(item => ({
                        id: item.id,
                        name: item.name || '',
                        type: (item.type === 'voice' ? 'voice' : 'text') as 'voice' | 'text',
                      }))}
                      activeChannelId={activeChannelId}
                      onChannelClick={(channel) => handleChannelClick({ id: channel.id, type: channel.type as 'text' | 'voice' | undefined })}
                      onAddClick={() => openModal('create-channel', { serverId, categoryId: category.id })}
                      isDraggable={isOwner}
                      draggedChannelId={draggedChannelId}
                      dragOverChannelId={dragOverChannelId}
                      dragOverPosition={dragOverPosition}
                      onChannelDragStart={handleChannelDragStart}
                      onChannelDragEnd={handleChannelDragEnd}
                      onChannelDragOver={handleChannelDragOver}
                      onChannelDragLeave={handleChannelDragLeave}
                      onChannelDrop={handleChannelDrop}
                      categoryId={category.id}
                      onDropZoneDragOver={handleCategoryDropZoneDragOver}
                      onDropZoneDrop={handleCategoryDropZoneDrop}
                      dragOverCategoryId={dragOverCategoryId}
                      voiceUsersByChannel={voiceUsersMap}
                      activeVoiceChannelId={voiceStore.currentChannelId}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      );
    }

    // No server selected
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500 text-sm">
        Select a server to view channels
      </div>
    );
  };

  return (
    <nav
      className={cn(
        'flex w-[30%] min-w-[200px] max-w-[320px] flex-col',
        'bg-gray-800 border-r border-gray-700'
      )}
    >
      {/* Top section: Server list + Channel/DM list */}
      <div className="flex flex-1 overflow-hidden">
        {/* Server list - 1/4 width */}
        <div className="flex w-[22%] min-w-[48px] flex-col items-center gap-2 overflow-y-auto bg-transparent py-2 scrollbar-hide border-r border-gray-700">
          {/* Home/DMs button */}
          <button
            onClick={handleHomeClick}
            className={cn(
              'flex h-12 w-12 aspect-square items-center justify-center rounded-2xl',
              'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white',
              'transition-all duration-200 hover:rounded-xl',
              (isHomePage || isDMView) && 'bg-gray-600 text-white rounded-xl'
            )}
            aria-label="Home"
          >
            <Home className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-8 w-8  bg-white border border-gray-700 rounded-full" />

          {/* Server list */}
          {serversLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <IconList
              variant="servers"
              items={serverItems}
              activeId={activeServerId}
              onItemClick={handleServerClick}
              onItemContextMenu={handleServerContextMenu}
              onReorder={handleServerReorder}
              showAddButton
              onAddClick={() => openModal('create-server')}
            />
          )}
        </div>

        {/* Channel/DM list - 3/4 width */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {renderChannelList()}
        </div>
      </div>

      {/* Voice Panel - Show when connected to voice */}
      {voiceStore.isConnected && voiceStore.currentChannelId && (
        <VoicePanel
          channel={channels.find(c => c.id === voiceStore.currentChannelId) as any}
        />
      )}

      {/* User Panel - Bottom */}
      <UserPanel />

      {/* Context Menus */}
      {serverContextMenu.contextMenu && (
        <ContextMenu
          items={getServerContextMenuItems()}
          position={serverContextMenu.contextMenu.position}
          onClose={serverContextMenu.closeContextMenu}
        />
      )}
      {channelContextMenu.contextMenu && (
        <ContextMenu
          items={getChannelContextMenuItems()}
          position={channelContextMenu.contextMenu.position}
          onClose={channelContextMenu.closeContextMenu}
        />
      )}
      {channelListContextMenu.contextMenu && (
        <ContextMenu
          items={getChannelListContextMenuItems()}
          position={channelListContextMenu.contextMenu.position}
          onClose={channelListContextMenu.closeContextMenu}
        />
      )}
      {dmContextMenu.contextMenu && (
        <ContextMenu
          items={getDMContextMenuItems()}
          position={dmContextMenu.contextMenu.position}
          onClose={dmContextMenu.closeContextMenu}
        />
      )}
    </nav>
  );
}
