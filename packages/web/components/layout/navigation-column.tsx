'use client';

import { cn } from '@/lib/utils';
import { IconList, type IconItem } from '@/components/navigation/icon-list';
import { ItemList, ChannelCategory } from '@/components/navigation/item-list';
import { UserPanel } from './user-panel';
import { VoicePanel } from '@/components/voice';
import { useUIStore, useVoiceStore } from '@/stores';
import { ContextMenu, useContextMenu, Dropdown, type ContextMenuItem } from '@/components/ui';
import { Home, Plus, Users, Settings, UserPlus, LogOut, Trash2, Edit2, X, ChevronDown, FolderPlus, Hash, Volume2, VolumeX, GripVertical, MicOff, Copy } from 'lucide-react';
import { useServers, useServerChannelsAndCategories, useLeaveServer, useUpdateServerPositions, useUpdateChannelPositions, useUpdateCategoryPositions } from '@/features/servers';
import { useDMChannels, useCloseDM } from '@/features/dms';
import { useAuthStore } from '@/stores';
import { useVoiceConnection, useServerVoiceStates, useCan } from '@/hooks';
import { useDeveloperMode } from '@/hooks/use-developer-mode';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useRef } from 'react';
import { Avatar } from '@/components/ui';

export function NavigationColumn() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const openModal = useUIStore((s) => s.openModal);

  // Developer mode for Copy ID
  const isDeveloperMode = useDeveloperMode();

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
  const updateCategoryPositions = useUpdateCategoryPositions(serverId);

  // Permission checks
  const canManageChannels = useCan(serverId, PERMISSION_FLAGS.MANAGE_CHANNELS);
  const canManageServer = useCan(serverId, PERMISSION_FLAGS.MANAGE_SERVER);

  // Drag and drop state for channels
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after'>('before');
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  // Category drag and drop state
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryIdForReorder, setDragOverCategoryIdForReorder] = useState<string | null>(null);

  // Collapsed categories state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

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
      icon: server.icon,
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
        isOnline: (recipient as any)?.isOnline ?? false,
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
    e.stopPropagation(); // Prevent category drag from also triggering
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
      e.stopPropagation(); // Only stop propagation when we're actually handling this
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

    // Check if user has permission to manage channels
    if (!canManageChannels) return;

    // Get the dragged channel
    const draggedChannel = channels.find(c => c.id === draggedChannelId);

    // Get channels in this category, sorted by position (excluding dragged channel if already here)
    const categoryChannels = channels
      .filter(c => ((c as any).category_id ?? null) === categoryId && c.id !== draggedChannelId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Add dragged channel at the end of this category
    const newCategoryOrder = [...categoryChannels, draggedChannel!];

    // Build positions for ALL channels in the server
    const otherChannels = channels.filter(c => ((c as any).category_id ?? null) !== categoryId && c.id !== draggedChannelId);
    otherChannels.sort((a, b) => (a.position || 0) - (b.position || 0));

    const allPositions: { id: string; position: number; categoryId: string | null }[] = [];

    // Add other channels first
    otherChannels.forEach((c, i) => {
      allPositions.push({
        id: c.id,
        position: i,
        categoryId: (c as any).category_id || null,
      });
    });

    // Add target category channels
    const startPos = otherChannels.length;
    newCategoryOrder.forEach((c, i) => {
      allPositions.push({
        id: c.id,
        position: startPos + i,
        categoryId: categoryId,
      });
    });

    updateChannelPositions.mutate(allPositions);
    handleChannelDragEnd();
  };

  const handleChannelDrop = (e: React.DragEvent, targetChannelId: string, targetCategoryId?: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent category drop handler from interfering
    if (!draggedChannelId || draggedChannelId === targetChannelId) {
      handleChannelDragEnd();
      return;
    }

    // Check if user has permission to manage channels
    if (!canManageChannels) return;

    // Get the target category
    const targetChannel = channels.find(c => c.id === targetChannelId);
    const targetCatId = (targetChannel as any)?.category_id || targetCategoryId || null;

    // Get channels in the target category, sorted by current position
    const categoryChannels = channels
      .filter(c => ((c as any).category_id ?? null) === targetCatId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Get target index based on drop position
    const targetIndex = categoryChannels.findIndex(c => c.id === targetChannelId);
    const insertIndex = dragOverPosition === 'before' ? targetIndex : targetIndex + 1;

    // Check if dragged channel is from same category
    const draggedChannel = channels.find(c => c.id === draggedChannelId);
    const isFromSameCategory = ((draggedChannel as any)?.category_id ?? null) === targetCatId;

    // Build the NEW order of channels in the target category
    let newCategoryOrder;
    if (isFromSameCategory) {
      // Reorder within same category
      const draggedIndex = categoryChannels.findIndex(c => c.id === draggedChannelId);
      newCategoryOrder = [...categoryChannels];
      const [draggedItem] = newCategoryOrder.splice(draggedIndex, 1);

      // Adjust insert index if dragging from above
      const adjustedIndex = draggedIndex < insertIndex ? insertIndex - 1 : insertIndex;
      newCategoryOrder.splice(adjustedIndex, 0, draggedItem);
    } else {
      // Moving from different category - insert into target category
      newCategoryOrder = [...categoryChannels];
      newCategoryOrder.splice(insertIndex, 0, draggedChannel!);
    }

    // Now build positions for ALL channels in the server
    // Start with channels NOT in the target category (keep their existing positions)
    const otherChannels = channels.filter(c => ((c as any).category_id ?? null) !== targetCatId && c.id !== draggedChannelId);

    // Sort other channels by their current position
    otherChannels.sort((a, b) => (a.position || 0) - (b.position || 0));

    // Build final positions array: other channels first, then target category channels
    const allPositions: { id: string; position: number; categoryId: string | null }[] = [];

    // Add other channels with their existing category and sequential positions
    otherChannels.forEach((c, i) => {
      allPositions.push({
        id: c.id,
        position: i,
        categoryId: (c as any).category_id || null,
      });
    });

    // Add target category channels with positions continuing from where we left off
    const startPos = otherChannels.length;
    newCategoryOrder.forEach((c, i) => {
      allPositions.push({
        id: c.id,
        position: startPos + i,
        categoryId: targetCatId,
      });
    });

    updateChannelPositions.mutate(allPositions);
    handleChannelDragEnd();
  };

  // Category drag and drop handlers
  const handleCategoryDragStart = (e: React.DragEvent, categoryId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
    setDraggedCategoryId(categoryId);
  };

  const handleCategoryDragOver = (e: React.DragEvent, categoryId: string) => {
    // Allow the event to propagate for channel drags
    // Only handle category reordering when actually dragging a category
    if (!draggedCategoryId) {
      // For channel drags, we need to allow the default behavior to enable dropping
      // The channel's own dragover handler will call preventDefault
      return;
    }
    e.preventDefault();
    if (draggedCategoryId !== categoryId) {
      setDragOverCategoryIdForReorder(categoryId);
    }
  };

  const handleCategoryDragLeave = () => {
    setDragOverCategoryIdForReorder(null);
  };

  const handleCategoryDrop = (e: React.DragEvent, targetCategoryId: string) => {
    // Only handle if we're dragging a category, not a channel
    if (!draggedCategoryId) return;
    e.preventDefault();
    if (draggedCategoryId === targetCategoryId) {
      handleChannelDragEnd();
      return;
    }

    // Check if user has permission to manage channels
    if (!canManageChannels) return;

    // Reorder categories
    const sortedCategories = [...categories].sort((a, b) => (a.position || 0) - (b.position || 0));
    const draggedIndex = sortedCategories.findIndex(c => c.id === draggedCategoryId);
    const targetIndex = sortedCategories.findIndex(c => c.id === targetCategoryId);

    const newOrder = [...sortedCategories];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    // Create positions array for API
    const positions = newOrder.map((c, i) => ({
      id: c.id,
      position: i,
    }));

    updateCategoryPositions.mutate(positions);
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

    const baseItems: ContextMenuItem[] = [
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
      { label: '', onClick: () => {}, divider: true },
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

    // Add Copy ID if developer mode is enabled
    if (isDeveloperMode) {
      baseItems.push(
        { label: '', onClick: () => {}, divider: true },
        {
          label: 'Copy Server ID',
          icon: <Copy className="h-4 w-4" />,
          onClick: () => navigator.clipboard.writeText(targetServerId),
        }
      );
    }

    return baseItems;
  };

  // Channel context menu
  const handleChannelContextMenu = (e: React.MouseEvent, item: { id: string; name?: string }) => {
    channelContextMenu.openContextMenu(e, item);
  };

  const getChannelContextMenuItems = () => {
    const channel = channelContextMenu.contextMenu?.data as { id: string; name?: string } | undefined;
    if (!channel || !serverId) return [];

    // Check if user can manage channels
    if (!canManageChannels) return [];

    const baseItems: ContextMenuItem[] = [
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

    // Add Copy ID if developer mode is enabled
    if (isDeveloperMode) {
      baseItems.push(
        { label: '', onClick: () => {}, divider: true },
        {
          label: 'Copy Channel ID',
          icon: <Copy className="h-4 w-4" />,
          onClick: () => navigator.clipboard.writeText(channel.id),
        }
      );
    }

    return baseItems;
  };

  // Channel list context menu (for creating channels/categories)
  const handleChannelListContextMenu = (e: React.MouseEvent) => {
    if (!serverId) return;

    if (!canManageChannels) return;

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
      ...(canManageServer
        ? [
            {
              id: 'settings',
              label: 'Server Settings',
              icon: <Settings className="h-4 w-4" />,
              onClick: () => openModal('server-settings', { serverId }),
            },
          ]
        : []),
      ...(canManageChannels
        ? [
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
                isHomePage ? 'bg-background-surface/80 text-foreground' : 'text-foreground hover:bg-background-surface hover:text-foreground'
              )}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Friends</span>
            </button>
          </div>

          {/* DM list */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground-muted uppercase">
              <span>Direct Messages</span>
              <button
                onClick={() => openModal('add-friend')}
                className="rounded p-1 hover:bg-background-surface"
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
                className="flex items-center justify-between w-full px-3 py-3 border-b border-border hover:bg-background-surface/50 transition-colors"
              >
                <span className="font-semibold text-foreground truncate">
                  {currentServer?.name || 'Server'}
                </span>
                <ChevronDown className="h-4 w-4 text-foreground-muted flex-shrink-0" />
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
              return !(channel as any)?.category_id;
            }).length > 0 && (
              <div className="py-1">
                {channelItems
                  .filter(ch => {
                    const channel = channels.find(c => c.id === ch.id);
                    return !(channel as any)?.category_id;
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
                      draggable={canManageChannels}
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
                            ? 'bg-background-surface/80 text-foreground'
                            : 'text-foreground-muted hover:bg-background-surface hover:text-foreground',
                          draggedChannelId === item.id && 'opacity-50',
                          canManageChannels && 'cursor-grab',
                          isActiveVoiceChannel && 'bg-success/20 text-success hover:bg-success/30'
                        )}
                      >
                        {item.type === 'voice' ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <Hash className="h-4 w-4" />
                        )}
                        <span className="flex-1 truncate text-sm">{item.name}</span>
                        {canManageChannels && (
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
                  })}
                {/* Drop zone at end of uncategorized channels */}
                {draggedChannelId && (
                  <div
                    onDragOver={(e) => handleCategoryDropZoneDragOver(e, null)}
                    onDrop={(e) => handleCategoryDropZoneDrop(e, null)}
                    className={cn(
                      'h-8 mx-1 rounded transition-colors',
                      dragOverCategoryId === null && !dragOverChannelId && 'bg-background-surface/50 border-2 border-dashed border-foreground-subtle'
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
                  return (channel as any)?.category_id === category.id;
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
                  <ChannelCategory
                    key={category.id}
                    name={category.name}
                    channels={sortedChannels.map(item => ({
                      id: item.id,
                      name: item.name || '',
                      type: (item.type === 'voice' ? 'voice' : 'text') as 'voice' | 'text',
                    }))}
                    activeChannelId={activeChannelId}
                    onChannelClick={(channel) => handleChannelClick({ id: channel.id, type: channel.type as 'text' | 'voice' | undefined })}
                    onChannelContextMenu={(e, channel) => handleChannelContextMenu(e, { id: channel.id, name: channel.name })}
                    onAddClick={() => openModal('create-channel', { serverId, categoryId: category.id })}
                    isCollapsed={collapsedCategories.has(category.id)}
                    onToggleCollapse={() => toggleCategoryCollapse(category.id)}
                    isDraggable={canManageChannels}
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
                    isCategoryDraggable={canManageChannels}
                    isCategoryDragging={draggedCategoryId === category.id}
                    isCategoryDragOver={dragOverCategoryIdForReorder === category.id}
                    onCategoryDragStart={(e) => handleCategoryDragStart(e, category.id)}
                    onCategoryDragEnd={handleChannelDragEnd}
                    onCategoryDragOver={(e) => handleCategoryDragOver(e, category.id)}
                    onCategoryDragLeave={handleCategoryDragLeave}
                    onCategoryDrop={(e) => handleCategoryDrop(e, category.id)}
                  />
                );
              })}
          </div>
        </div>
      );
    }

    // No server selected
    return (
      <div className="flex flex-1 items-center justify-center text-foreground-subtle text-sm">
        Select a server to view channels
      </div>
    );
  };

  return (
    <nav
      className={cn(
        'flex w-[30%] min-w-[200px] max-w-[320px] flex-col',
        'bg-background-elevated border-r border-border'
      )}
    >
      {/* Top section: Server list + Channel/DM list */}
      <div className="flex flex-1 overflow-hidden">
        {/* Server list - 1/4 width */}
        <div className="flex w-[22%] min-w-[48px] flex-col items-center gap-2 overflow-y-auto bg-transparent py-2 scrollbar-hide border-r border-border">
          {/* Home/DMs button */}
          <button
            onClick={handleHomeClick}
            className={cn(
              'flex h-12 w-12 aspect-square items-center justify-center rounded-2xl',
              'bg-background-surface text-foreground hover:bg-background-surface/80 hover:text-foreground',
              'transition-all duration-200 hover:rounded-xl',
              (isHomePage || isDMView) && 'bg-background-surface/80 text-foreground rounded-xl'
            )}
            aria-label="Home"
          >
            <Home className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-0.5 w-8  bg-white border border-border rounded-full" />

          {/* Server list */}
          {serversLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
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
