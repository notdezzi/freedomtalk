'use client';

import { cn } from '@/lib/utils';
import { IconList, type IconItem } from '@/components/navigation/icon-list';
import {
  ItemList,
  ChannelCategory,
  SortableChannelItem,
  CategoryDragHandle,
  ChannelDropZone,
} from '@/components/navigation/item-list';
import { UserPanel } from './user-panel';
import { VoicePanel } from '@/components/voice';
import { useUIStore, useVoiceStore } from '@/stores';
import { Dropdown } from '@/components/ui';
import { ContextMenu, useContextMenu, type ContextMenuItem } from '@/components/common/context-menu';
import { Home, Plus, Users, Settings, UserPlus, LogOut, Trash2, Edit2, X, ChevronDown, FolderPlus, Hash, GripVertical, Copy } from 'lucide-react';
import { useServers, useServerChannelsAndCategories, useLeaveServer, useUpdateServerPositions, useUpdateChannelPositions, useUpdateCategoryPositions } from '@/features/servers';
import { useDMChannels, useCloseDM } from '@/features/dms';
import { useAuthStore } from '@/stores';
import { useVoiceConnection, useServerVoiceStates, useCan } from '@/hooks';
import { useDeveloperMode } from '@/hooks/use-developer-mode';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

export function NavigationColumn() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const openModal = useUIStore((s) => s.openModal);
  const isMobileNavOpen = useUIStore((s) => s.isMobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  // Close the mobile drawer after navigating
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  // Developer mode for Copy ID
  const isDeveloperMode = useDeveloperMode();

  // Get current user ID
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Voice connection
  const { joinChannel: joinVoiceChannel } = useVoiceConnection();
  // Narrow slices only — a wholesale subscription would re-render the whole
  // column on every voice event (speaking flags, stream changes, etc.)
  const voiceUsers = useVoiceStore((s) => s.users);
  const voiceChannelStates = useVoiceStore((s) => s.channelStates);
  const isVoiceConnected = useVoiceStore((s) => s.isConnected);
  const currentVoiceChannelId = useVoiceStore((s) => s.currentChannelId);

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

  // Precomputed channel lookup — the render loops below used to call
  // channels.find() per item, making renders O(n²) on large servers.
  const channelMap = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);

  // Mutations
  const leaveServer = useLeaveServer();
  const closeDM = useCloseDM();
  const updateServerPositions = useUpdateServerPositions();
  const updateChannelPositions = useUpdateChannelPositions(serverId);
  const updateCategoryPositions = useUpdateCategoryPositions(serverId);

  // Permission checks
  const canManageChannels = useCan(serverId, PERMISSION_FLAGS.MANAGE_CHANNELS);
  const canManageServer = useCan(serverId, PERMISSION_FLAGS.MANAGE_SERVER);

  // Drag and drop (dnd-kit) — touch and keyboard accessible
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

  // Active drag for the overlay: { type, id, name }
  const [activeDrag, setActiveDrag] = useState<{ type: 'channel' | 'category'; id: string; name: string } | null>(null);

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
      color: 'var(--accent)',
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
    if (voiceChannelStates[channelId]) {
      return voiceChannelStates[channelId];
    }
    // Fall back to users (current channel only)
    return voiceUsers.filter((u) => u.channelId === channelId);
  };

  // Check if current user is in a specific voice channel
  const isInVoiceChannel = (channelId: string) => {
    return isVoiceConnected && currentVoiceChannelId === channelId;
  };

  const handleDMClick = (item: { id: string }) => {
    router.push(`/app/dms/${item.id}`);
  };

  const handleHomeClick = () => {
    router.push('/app');
  };

  // dnd-kit drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('channel:')) {
      const channel = channels.find((c) => c.id === id.slice('channel:'.length));
      setActiveDrag({ type: 'channel', id, name: channel?.name || '' });
    } else if (id.startsWith('category:')) {
      const category = categories.find((c) => c.id === id.slice('category:'.length));
      setActiveDrag({ type: 'category', id, name: category?.name || '' });
    }
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
  };

  // Move a channel into a category (null = uncategorized) at the given index,
  // persisting positions for ALL channels (same contract as the previous HTML5 drop handlers).
  const moveChannelToCategory = (channelId: string, targetCatId: string | null, insertIndex: number) => {
    if (!canManageChannels) return;

    const draggedChannel = channels.find((c) => c.id === channelId);
    if (!draggedChannel) return;

    // Get channels in the target category (excluding dragged channel), sorted by position
    const categoryChannels = channels
      .filter((c) => ((c as any).category_id ?? null) === targetCatId && c.id !== channelId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Insert the dragged channel at the requested index
    const newCategoryOrder = [...categoryChannels];
    const clampedIndex = Math.max(0, Math.min(insertIndex, newCategoryOrder.length));
    newCategoryOrder.splice(clampedIndex, 0, draggedChannel);

    // Build positions for ALL channels in the server (other categories keep their relative order)
    const otherChannels = channels.filter((c) => ((c as any).category_id ?? null) !== targetCatId && c.id !== channelId);
    otherChannels.sort((a, b) => (a.position || 0) - (b.position || 0));

    const allPositions: { id: string; position: number; categoryId: string | null }[] = [];

    otherChannels.forEach((c, i) => {
      allPositions.push({
        id: c.id,
        position: i,
        categoryId: (c as any).category_id || null,
      });
    });

    const startPos = otherChannels.length;
    newCategoryOrder.forEach((c, i) => {
      allPositions.push({
        id: c.id,
        position: startPos + i,
        categoryId: targetCatId,
      });
    });

    updateChannelPositions.mutate(allPositions);
  };

  const handleDndDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Category reordering
    if (activeId.startsWith('category:')) {
      const draggedCatId = activeId.slice('category:'.length);
      let targetCatId: string | null = null;

      if (overId.startsWith('category:')) {
        targetCatId = overId.slice('category:'.length);
      } else if (overId.startsWith('channel:')) {
        const overChannel = channels.find((c) => c.id === overId.slice('channel:'.length));
        targetCatId = ((overChannel as any)?.category_id ?? null) || null;
      } else {
        return;
      }

      if (!targetCatId || draggedCatId === targetCatId) return;
      if (!canManageChannels) return;

      // Reorder categories (same persistence as the previous HTML5 category drop)
      const sortedCategories = [...categories].sort((a, b) => (a.position || 0) - (b.position || 0));
      const fromIndex = sortedCategories.findIndex((c) => c.id === draggedCatId);
      const toIndex = sortedCategories.findIndex((c) => c.id === targetCatId);
      if (fromIndex === -1 || toIndex === -1) return;

      const newOrder = arrayMove(sortedCategories, fromIndex, toIndex);
      updateCategoryPositions.mutate(newOrder.map((c, i) => ({ id: c.id, position: i })));
      return;
    }

    // Channel moving (within/between categories, or to end of a category)
    if (activeId.startsWith('channel:')) {
      const channelId = activeId.slice('channel:'.length);
      let targetCatId: string | null;
      let insertIndex: number;

      if (overId.startsWith('channel:')) {
        const overChannelId = overId.slice('channel:'.length);
        if (overChannelId === channelId) return;

        const overChannel = channels.find((c) => c.id === overChannelId);
        targetCatId = ((overChannel as any)?.category_id ?? null) || null;

        const categoryChannels = channels
          .filter((c) => ((c as any).category_id ?? null) === targetCatId && c.id !== channelId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        const overIndex = categoryChannels.findIndex((c) => c.id === overChannelId);
        insertIndex = overIndex === -1 ? categoryChannels.length : overIndex;
      } else if (overId.startsWith('zone:')) {
        targetCatId = overId === 'zone:uncategorized' ? null : overId.slice('zone:'.length);
        const categoryChannels = channels
          .filter((c) => ((c as any).category_id ?? null) === targetCatId && c.id !== channelId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        insertIndex = categoryChannels.length;
      } else if (overId.startsWith('category:')) {
        targetCatId = overId.slice('category:'.length);
        const categoryChannels = channels
          .filter((c) => ((c as any).category_id ?? null) === targetCatId && c.id !== channelId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        insertIndex = categoryChannels.length;
      } else {
        return;
      }

      moveChannelToCategory(channelId, targetCatId, insertIndex);
    }
  };

  // Sortable ids for the categories context
  const categoryIds = useMemo(
    () =>
      categories
        .slice()
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((c) => `category:${c.id}`),
    [categories]
  );

  // Uncategorized (no category) channel ids, sorted by position
  const uncategorizedItems = useMemo(
    () =>
      channelItems
        .filter((ch) => {
          const channel = channelMap.get(ch.id);
          return !(channel as any)?.category_id;
        })
        .slice()
        .sort((a, b) => {
          const chA = channelMap.get(a.id);
          const chB = channelMap.get(b.id);
          return (chA?.position || 0) - (chB?.position || 0);
        }),
    [channelItems, channelMap]
  );

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
                isHomePage ? 'bg-background-hover text-foreground' : 'text-foreground-muted hover:bg-white/[0.04] hover:text-foreground'
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
                className="flex items-center justify-between w-full px-4 py-3 border-b border-border hover:bg-white/[0.04] transition-colors"
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

          {/* Channel List - dnd-kit context for touch/keyboard reordering */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDndDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={categoryIds} strategy={rectSortingStrategy}>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Uncategorised channels (no categoryId) */}
                {uncategorizedItems.length > 0 && (
                  <div className="py-1">
                    <SortableContext
                      items={uncategorizedItems.map((item) => `channel:${item.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {uncategorizedItems.map((item) => {
                        const voiceUsers = item.type === 'voice' ? getUsersInVoiceChannel(item.id) : [];
                        const isActiveVoiceChannel = item.type === 'voice' && isInVoiceChannel(item.id);

                        return (
                          <SortableChannelItem
                            key={item.id}
                            channel={{ id: item.id, name: item.name, type: item.type }}
                            isActive={item.id === activeChannelId}
                            isDraggable={canManageChannels}
                            onClick={() => handleChannelClick({ id: item.id, type: item.type })}
                            onContextMenu={(e) => handleChannelContextMenu(e, { id: item.id, name: item.name })}
                            voiceUsers={voiceUsers}
                            isActiveVoiceChannel={isActiveVoiceChannel}
                          />
                        );
                      })}
                    </SortableContext>
                    {/* Drop zone at end of uncategorized channels */}
                    {canManageChannels && <ChannelDropZone id="zone:uncategorized" enabled />}
                  </div>
                )}

                {/* Categories with their channels */}
                {categories
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map((category) => {
                    const categoryChannels = channelItems.filter(ch => {
                      const channel = channelMap.get(ch.id);
                      return (channel as any)?.category_id === category.id;
                    });

                    // Sort channels by position
                    const sortedChannels = categoryChannels
                      .map(item => {
                        const channel = channelMap.get(item.id);
                        return { ...item, position: channel?.position || 0 };
                      })
                      .sort((a, b) => a.position - b.position);

                    // Build voice users map for this category's channels
                    const voiceUsersMap: Record<string, typeof voiceUsers> = {};
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
                        categoryId={category.id}
                        voiceUsersByChannel={voiceUsersMap}
                        activeVoiceChannelId={currentVoiceChannelId}
                        isDraggable={canManageChannels}
                        isCategoryDraggable={canManageChannels}
                      />
                    );
                  })}
              </div>
            </SortableContext>

            {/* Drag overlay */}
            <DragOverlay>
              {activeDrag && (
                <div className="flex items-center gap-2 rounded px-2 py-1.5 bg-background-elevated shadow-lg border border-border w-56">
                  {activeDrag.type === 'category' ? (
                    <>
                      <ChevronDown className="h-3 w-3 text-foreground-subtle" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
                        {activeDrag.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <GripVertical className="h-4 w-4 text-foreground-subtle" />
                      <span className="text-sm text-foreground truncate">{activeDrag.name}</span>
                    </>
                  )}
                </div>
              )}
            </DragOverlay>
          </DndContext>
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
        'flex w-[30%] min-w-[240px] max-w-[320px] flex-col',
        'bg-list border-r border-border',
        // Mobile/tablet (<lg): slide-over drawer at full width
        'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50',
        'max-lg:w-full max-lg:min-w-0 max-lg:max-w-none max-lg:shadow-xl',
        'max-lg:transition-transform max-lg:duration-200',
        isMobileNavOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'
      )}
    >
      {/* Mobile backdrop — portaled to body: inside the nav, its transform would
          become the backdrop's containing block and the scrim would never leave the drawer */}
      {isMobileNavOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />,
          document.body
        )}

      {/* Mobile drawer close — the full-width drawer covers the scrim, so it needs its own control */}
      {isMobileNavOpen && (
        <button
          onClick={() => setMobileNavOpen(false)}
          className="absolute right-12 top-2.5 z-10 rounded p-2 text-foreground-muted transition-colors hover:bg-white/[0.04] hover:text-foreground lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Top section: Server list + Channel/DM list */}
      <div className="flex flex-1 overflow-hidden">
        {/* Server list - fixed 72px rail */}
        <div className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-rail py-3 scrollbar-hide">
          {/* Home/DMs button */}
          <button
            onClick={handleHomeClick}
            className={cn(
              'flex h-12 w-12 aspect-square items-center justify-center',
              'transition-all duration-200 rounded-full hover:rounded-[16px]',
              (isHomePage || isDMView)
                ? 'bg-accent text-white rounded-[16px]'
                : 'bg-background-surface text-foreground-muted hover:bg-background-hover hover:text-foreground'
            )}
            aria-label="Home"
          >
            <Home className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-0.5 w-8 rounded-full bg-background-surface" />

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
      {isVoiceConnected && currentVoiceChannelId && (
        <VoicePanel
          channel={channelMap.get(currentVoiceChannelId) as any}
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
