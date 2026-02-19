'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useServers, useUpdateServer, useLeaveServer } from '@/features/servers';
import { useAuthStore, useUIStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { Settings, Users, UserPlus, Trash2, LogOut } from 'lucide-react';

interface ServerSettingsModalProps {
  serverId: string;
  onClose: () => void;
}

type SettingsTab = 'overview' | 'members' | 'invites';

export function ServerSettingsModal({ serverId, onClose }: ServerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const router = useRouter();

  // Use the servers list to get the server data (cached)
  const { data: servers = [], isLoading } = useServers();
  const server = servers.find(s => s.id === serverId);

  const updateServer = useUpdateServer();
  const leaveServer = useLeaveServer();

  // Get current user ID and modal opener
  const currentUserId = useAuthStore((s) => s.user?.id);
  const openModal = useUIStore((s) => s.openModal);

  // Check if current user is owner
  const isOwner = server && ((server?.ownerId || (server as any)?.owner_id) === currentUserId);

  // Initialize form when server loads
  useEffect(() => {
    if (server) {
      setName(server.name || '');
      setDescription(server.description || '');
    }
  }, [server]);

  const handleSave = () => {
    updateServer.mutate(
      { serverId, data: { name, description } },
      { onSuccess: () => onClose() }
    );
  };

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

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <Settings className="h-4 w-4" /> },
    { id: 'members' as const, label: 'Members', icon: <Users className="h-4 w-4" /> },
    { id: 'invites' as const, label: 'Invites', icon: <UserPlus className="h-4 w-4" /> },
  ];

  if (isLoading) {
    return (
      <Modal open onClose={onClose} className="max-w-2xl">
        <div className="p-8 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </Modal>
    );
  }

  if (!server) {
    return (
      <Modal open onClose={onClose} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Error</h2>
          <p className="text-red-400 mb-4">Server not found.</p>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} className="!p-0 !max-w-4xl !bg-gray-800">
      <div className="flex h-[500px]">
        {/* Sidebar */}
        <div className="w-48 bg-gray-900 p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Server Settings
          </h2>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-left',
                  'transition-colors',
                  activeTab === tab.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-4 border-t border-gray-700">
            <button
              onClick={handleLeave}
              disabled={leaveServer.isPending}
              className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-left text-red-400 hover:bg-red-500/10 disabled:opacity-50"
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

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6">Server Overview</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    Server Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Tell the world about your server"
                  />
                </div>

              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} variant="primary" disabled={updateServer.isPending}>
                  {updateServer.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6">Members</h3>
              <p className="text-gray-400">Member management coming soon...</p>
            </div>
          )}

          {activeTab === 'invites' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6">Invites</h3>
              <p className="text-gray-400">Invite management coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
