'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useServer, useLeaveServer } from '@/features/servers';
import { useAuthStore, useUIStore } from '@/stores';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Shield,
  Users,
  Hash,
  UserPlus,
  Ban,
  Trash2,
  LogOut,
} from 'lucide-react';

import { OverviewTab } from './tabs/overview-tab';
import { RolesTab } from './tabs/roles-tab';
import { MembersTab } from './tabs/members-tab';
import { ChannelsTab } from './tabs/channels-tab';
import { InvitesTab } from './tabs/invites-tab';
import { BansTab } from './tabs/bans-tab';

interface ServerSettingsModalProps {
  serverId: string;
  onClose: () => void;
}

type SettingsTab = 'overview' | 'roles' | 'members' | 'channels' | 'invites' | 'bans';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Settings className="h-4 w-4" /> },
  { id: 'roles', label: 'Roles', icon: <Shield className="h-4 w-4" /> },
  { id: 'members', label: 'Members', icon: <Users className="h-4 w-4" /> },
  { id: 'channels', label: 'Channels', icon: <Hash className="h-4 w-4" /> },
  { id: 'invites', label: 'Invites', icon: <UserPlus className="h-4 w-4" /> },
  { id: 'bans', label: 'Bans', icon: <Ban className="h-4 w-4" /> },
];

export function ServerSettingsModal({ serverId, onClose }: ServerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const router = useRouter();

  const { data: server, isLoading } = useServer(serverId);
  const leaveServer = useLeaveServer();

  // Get current user ID and modal opener
  const currentUserId = useAuthStore((s) => s.user?.id);
  const openModal = useUIStore((s) => s.openModal);

  // Check if current user is owner
  const isOwner = server && ((server?.ownerId || (server as any)?.owner_id) === currentUserId);

  const handleLeave = () => {
    // Owners can't leave - they must delete the server
    if (isOwner) {
      openModal('delete-server', { serverId });
      return;
    }

    leaveServer.mutate(serverId, {
      onSuccess: () => {
        onClose();
        router.push('/app');
      },
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab serverId={serverId} />;
      case 'roles':
        return <RolesTab serverId={serverId} />;
      case 'members':
        return <MembersTab serverId={serverId} />;
      case 'channels':
        return <ChannelsTab serverId={serverId} />;
      case 'invites':
        return <InvitesTab serverId={serverId} />;
      case 'bans':
        return <BansTab serverId={serverId} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Modal open onClose={onClose} className="max-w-4xl">
        <div className="p-8 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      </Modal>
    );
  }

  if (!server) {
    return (
      <Modal open onClose={onClose} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Error</h2>
          <p className="text-error mb-4">Server not found.</p>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} className="!p-0 !max-w-4xl !bg-background-elevated">
      <div className="flex h-[500px]">
        {/* Left Sidebar */}
        <div className="w-56 bg-background-surface border-r border-border flex flex-col">
          {/* Server Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {server.icon ? (
                <img
                  src={server.icon}
                  alt={server.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-semibold">
                  {/* {server.name.charAt(0).toUpperCase()} */}
                </div>
              )}
              <h2 className="font-semibold text-foreground truncate">
                {server.name}
              </h2>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 p-2 space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-left',
                  'transition-colors',
                  activeTab === tab.id
                    ? 'bg-background-elevated text-foreground'
                    : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated/50'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Leave/Delete Server Button */}
          <div className="p-2 border-t border-border">
            <button
              onClick={handleLeave}
              disabled={leaveServer.isPending}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-left',
                'transition-colors',
                isOwner
                  ? 'text-error hover:bg-error/10'
                  : 'text-error hover:bg-error/10',
                'disabled:opacity-50'
              )}
            >
              {isOwner ? (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Server
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  {leaveServer.isPending ? 'Leaving...' : 'Leave Server'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </Modal>
  );
}
