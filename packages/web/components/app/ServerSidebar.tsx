'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Plus, Compass } from 'lucide-react';
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
import { useServerStore, Server } from '@/stores/serverStore';
import { useUIStore } from '@/stores/uiStore';
import { apiClient } from '@/lib/api-client';

interface SortableServerIconProps {
  server: Server;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function SortableServerIcon({ server, isSelected, onClick, onContextMenu }: SortableServerIconProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: server.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    setShowTooltip(true);
  };

  const hasNotification = server.hasNotification || (server.unreadCount && server.unreadCount > 0);

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Indicator */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 rounded-r-full transition-all duration-200 ${
          isSelected
            ? 'h-10 bg-foreground'
            : hasNotification
            ? 'h-2 bg-accent'
            : 'group-hover:h-5 h-0 bg-foreground'
        }`}
      />

      <button
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
        className={`group w-12 h-12 aspect-square flex items-center justify-center transition-all duration-200 ${
          isSelected
            ? 'rounded-2xl bg-accent text-background'
            : 'rounded-full bg-background-surface text-foreground-muted hover:bg-accent hover:text-background hover:rounded-2xl'
        }`}
        aria-label={server.name || 'Server'}
        {...attributes}
        {...listeners}
      >
        {server.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={server.icon} alt="" className="w-full h-full rounded-inherit object-cover" />
        ) : (
          <span className="font-semibold text-sm">
            {(server.name || 'S').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isDragging && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg bg-background-elevated border border-border shadow-lg animate-fade-in"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translateY(-50%)',
          }}
        >
          <p className="text-sm font-semibold whitespace-nowrap">{server.name || 'Server'}</p>
          {server.unreadCount && server.unreadCount > 0 && (
            <p className="text-xs text-accent">{server.unreadCount} unread</p>
          )}
        </div>
      )}
    </div>
  );
}

function AddServerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-12 h-12 aspect-square flex items-center justify-center rounded-full bg-background-surface text-accent hover:bg-accent hover:text-background hover:rounded-2xl transition-all duration-200"
      aria-label="Add a server"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}

function ExploreButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-12 h-12 aspect-square flex items-center justify-center rounded-full bg-background-surface text-secondary hover:bg-secondary hover:text-background hover:rounded-2xl transition-all duration-200"
      aria-label="Explore servers"
    >
      <Compass className="w-6 h-6" />
    </button>
  );
}

export default function ServerSidebar() {
  const router = useRouter();
  const { servers, currentServerId, setCurrentServer, clearServerUnread, reorderServers } = useServerStore();
  const { openModal, openContextMenu, isServerSidebarOpen } = useUIStore();

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

  const validServers = servers.filter((server) => server && server.id);
  const serverIds = validServers.map((s) => s.id);

  const handleServerClick = useCallback(
    (server: Server) => {
      // Always allow navigation - the condition was preventing navigation
      // when clicking on the same server while on DMs page
      setCurrentServer(server.id);
      clearServerUnread(server.id);
      router.push(`/app/servers/${server.id}`);
    },
    [setCurrentServer, clearServerUnread, router]
  );

  const handleHomeClick = useCallback(() => {
    setCurrentServer(null);
    router.push('/app');
  }, [setCurrentServer, router]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, server: Server) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, 'server', { serverId: server.id });
    },
    [openContextMenu]
  );

  const handleAddServer = useCallback(() => {
    openModal('create-server');
  }, [openModal]);

  const handleExplore = useCallback(() => {
    router.push('/discover');
  }, [router]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = serverIds.indexOf(active.id as string);
        const newIndex = serverIds.indexOf(over.id as string);

        const newOrder = arrayMove(serverIds, oldIndex, newIndex);
        reorderServers(newOrder);

        // Persist to backend
        try {
          const positions = newOrder.map((id, index) => ({ id, position: index }));
          await apiClient.updateServerPositions(positions);
        } catch (error) {
          console.error('Failed to update server positions:', error);
        }
      }
    },
    [serverIds, reorderServers]
  );

  if (!isServerSidebarOpen) return null;

  return (
    <nav
      className="flex flex-1 flex-col items-center py-3 gap-2 bg-background-elevated border-r border-border overflow-y-auto scrollbar-hide"
      aria-label="Servers"
    >
      {/* Home / DMs */}
      <div className="relative group">
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 rounded-r-full transition-all duration-200 ${
            !currentServerId ? 'h-10 bg-foreground' : 'group-hover:h-5 h-0 bg-foreground'
          }`}
        />
        <button
          onClick={handleHomeClick}
          className={`w-12 h-12 flex items-center justify-center transition-all duration-200 ${
            !currentServerId
              ? 'rounded-2xl bg-accent text-background'
              : 'rounded-full bg-accent-muted text-accent hover:bg-accent hover:text-background hover:rounded-2xl'
          }`}
          aria-label="Home"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-8 h-0.5 rounded-full bg-border my-1" />

      {/* Servers with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={serverIds} strategy={verticalListSortingStrategy} >
          {validServers.map((server, index) => (
            <SortableServerIcon
              key={server.id || `server-${index}`}
              server={server}
              isSelected={currentServerId === server.id}
              onClick={() => handleServerClick(server)}
              onContextMenu={(e) => handleContextMenu(e, server)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Divider */}
      <div className="w-8 h-0.5 rounded-full bg-border my-1" />

      {/* Add server */}
      <AddServerButton onClick={handleAddServer} />

      {/* Explore */}
      <ExploreButton onClick={handleExplore} />
    </nav>
  );
}
