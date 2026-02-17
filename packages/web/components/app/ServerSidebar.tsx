'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Plus, Compass, Download, Circle, ChevronDown } from 'lucide-react';
import { useServerStore, Server, ServerFolder } from '@/stores/serverStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuth } from '@/hooks/useAuth';

function ServerIcon({
  server,
  isSelected,
  onClick,
  onContextMenu,
}: {
  server: Server;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    setShowTooltip(true);
  };

  const hasNotification = server.hasNotification || (server.unreadCount && server.unreadCount > 0);

  return (
    <div className="relative">
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
        className={`group w-12 h-12 flex items-center justify-center transition-all duration-200 ${
          isSelected
            ? 'rounded-2xl bg-accent text-background'
            : 'rounded-full bg-background-surface text-foreground-muted hover:bg-accent hover:text-background hover:rounded-2xl'
        }`}
        aria-label={server.name || 'Server'}
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
      {showTooltip && (
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
      className="group w-12 h-12 flex items-center justify-center rounded-full bg-background-surface text-accent hover:bg-accent hover:text-background hover:rounded-2xl transition-all duration-200"
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
      className="group w-12 h-12 flex items-center justify-center rounded-full bg-background-surface text-secondary hover:bg-secondary hover:text-background hover:rounded-2xl transition-all duration-200"
      aria-label="Explore servers"
    >
      <Compass className="w-6 h-6" />
    </button>
  );
}

function DownloadButton() {
  return (
    <button
      className="group w-12 h-12 flex items-center justify-center rounded-full bg-background-surface text-success hover:bg-success hover:text-background hover:rounded-2xl transition-all duration-200"
      aria-label="Download app"
    >
      <Download className="w-6 h-6" />
    </button>
  );
}

function FolderDivider({ folder }: { folder: ServerFolder }) {
  const { toggleFolderCollapse } = useServerStore();

  return (
    <button
      onClick={() => toggleFolderCollapse(folder.id)}
      className="w-12 h-6 flex items-center justify-center group"
      aria-label={`Toggle ${folder.name} folder`}
    >
      <div
        className={`w-8 h-0.5 rounded-full transition-colors ${
          folder.isCollapsed ? 'bg-foreground-muted' : 'bg-accent'
        }`}
        style={{ backgroundColor: folder.isCollapsed ? undefined : folder.color }}
      />
    </button>
  );
}

export default function ServerSidebar() {
  const router = useRouter();
  const { user } = useAuth();
  const { servers, folders, currentServerId, setCurrentServer, clearServerUnread } = useServerStore();
  const { openModal, openContextMenu, isServerSidebarOpen } = useUIStore();

  const handleServerClick = useCallback(
    (server: Server) => {
      if (currentServerId !== server.id) {
        setCurrentServer(server.id);
        clearServerUnread(server.id);
        router.push(`/app/servers/${server.id}`);
      }
    },
    [currentServerId, setCurrentServer, clearServerUnread, router]
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

  if (!isServerSidebarOpen) return null;

  return (
    <nav
      className="w-[72px] bg-background-elevated flex flex-col items-center py-3 gap-2 overflow-y-auto scrollbar-hide"
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

      {/* Servers */}
      {servers.filter((server) => server && server.id).map((server, index) => (
        <ServerIcon
          key={server.id || `server-${index}`}
          server={server}
          isSelected={currentServerId === server.id}
          onClick={() => handleServerClick(server)}
          onContextMenu={(e) => handleContextMenu(e, server)}
        />
      ))}

      {/* Divider */}
      <div className="w-8 h-0.5 rounded-full bg-border my-1" />

      {/* Add server */}
      <AddServerButton onClick={handleAddServer} />

      {/* Explore */}
      <ExploreButton onClick={handleExplore} />
    </nav>
  );
}
