'use client';

import { useEffect, useRef } from 'react';
import { Settings, UserPlus, Bell, BellOff, LogOut, Trash2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useServerStore } from '@/stores/serverStore';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { ServerMember } from '@/stores/memberStore';

export default function ContextMenuRenderer() {
  const { contextMenu, closeContextMenu, openModal } = useUIStore();
  const { servers, removeServer, toggleServerMute } = useServerStore();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const { x, y, type, data } = contextMenu;

  // Server context menu
  if (type === 'server') {
    const serverId = data?.serverId as string;
    const server = servers.find((s) => s.id === serverId);

    if (!server) return null;

    const handleSettings = () => {
      openModal('server-settings', { serverId });
      closeContextMenu();
    };

    const handleInvite = () => {
      openModal('server-settings', { serverId, tab: 'invites' });
      closeContextMenu();
    };

    const handleMute = async () => {
      toggleServerMute(serverId);
      closeContextMenu();
    };

    const handleLeave = async () => {
      if (!confirm(`Leave "${server.name}"?`)) return;

      const response = await apiClient.leaveServer(serverId);
      if (response.success) {
        removeServer(serverId);
        router.push('/app');
      }
      closeContextMenu();
    };

    const handleDelete = async () => {
      if (!server.isOwner) return;
      if (!confirm(`Delete "${server.name}"? This cannot be undone.`)) return;

      const response = await apiClient.deleteServer(serverId);
      if (response.success) {
        removeServer(serverId);
        router.push('/app');
      }
      closeContextMenu();
    };

    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[180px] bg-background-elevated rounded-lg border border-border shadow-lg py-1"
        style={{ left: x, top: y }}
      >
        <button
          onClick={handleSettings}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface"
        >
          <Settings className="w-4 h-4" />
          Server Settings
        </button>
        <button
          onClick={handleInvite}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface"
        >
          <UserPlus className="w-4 h-4" />
          Invite People
        </button>
        <div className="my-1 border-t border-border" />
        <button
          onClick={handleMute}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface"
        >
          {server.muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          {server.muted ? 'Unmute Server' : 'Mute Server'}
        </button>
        <div className="my-1 border-t border-border" />
        {server.isOwner ? (
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10"
          >
            <Trash2 className="w-4 h-4" />
            Delete Server
          </button>
        ) : (
          <button
            onClick={handleLeave}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10"
          >
            <LogOut className="w-4 h-4" />
            Leave Server
          </button>
        )}
      </div>
    );
  }

  // Member context menu
  if (type === 'member') {
    const member = data?.member as ServerMember | undefined;
    const serverId = data?.serverId as string;

    if (!member || !serverId) return null;

    const handleProfile = () => {
      openModal('user-profile', { userId: member.userId, member });
      closeContextMenu();
    };

    const handleKick = async () => {
      if (!confirm(`Kick ${member.displayName || member.username}?`)) return;

      await apiClient.kickMember(serverId, member.userId);
      closeContextMenu();
    };

    const handleBan = async () => {
      if (!confirm(`Ban ${member.displayName || member.username}?`)) return;

      await apiClient.banMember(serverId, member.userId);
      closeContextMenu();
    };

    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[180px] bg-background-elevated rounded-lg border border-border shadow-lg py-1"
        style={{ left: x, top: y }}
      >
        <button
          onClick={handleProfile}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface"
        >
          Profile
        </button>
        <div className="my-1 border-t border-border" />
        <button
          onClick={handleKick}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10"
        >
          Kick
        </button>
        <button
          onClick={handleBan}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10"
        >
          Ban
        </button>
      </div>
    );
  }

  return null;
}
