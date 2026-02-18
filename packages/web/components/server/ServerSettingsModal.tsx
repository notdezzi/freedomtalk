'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Settings, Users, Shield, Link2, Trash2, Ban, Webhook, ScrollText } from 'lucide-react';
import { useServerStore } from '@/stores/serverStore';
import { apiClient } from '@/lib/api-client';
import ServerOverviewTab from './ServerOverviewTab';
import ServerMembersTab from './ServerMembersTab';
import ServerRolesTab from './ServerRolesTab';
import ServerInvitesTab from './ServerInvitesTab';
import ServerBansTab from './ServerBansTab';
import WebhooksTab from './WebhooksTab';
import AuditLogsTab from './AuditLogsTab';

interface ServerSettingsModalProps {
  serverId: string;
  initialTab?: string;
  onClose: () => void;
}

type TabType = 'overview' | 'members' | 'roles' | 'invites' | 'webhooks' | 'audit' | 'bans';

const tabs: { id: TabType; label: string; icon: typeof Settings }[] = [
  { id: 'overview', label: 'Overview', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'invites', label: 'Invites', icon: Link2 },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
  { id: 'bans', label: 'Bans', icon: Ban },
];

const isValidTab = (tab: string | undefined): tab is TabType => {
  return tabs.some(t => t.id === tab);
};

export default function ServerSettingsModal({ serverId, initialTab, onClose }: ServerSettingsModalProps) {
  const { servers, updateServer } = useServerStore();
  const [activeTab, setActiveTab] = useState<TabType>(isValidTab(initialTab) ? initialTab : 'overview');
  const [isOwner, setIsOwner] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const server = servers.find((s) => s.id === serverId);

  useEffect(() => {
    if (server) {
      setIsOwner(server.isOwner);
    }
  }, [server]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!server) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-background-elevated rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex overflow-hidden"
      >
        {/* Sidebar */}
        <div className="w-56 bg-background flex flex-col border-r border-border">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg truncate">{server.name}</h2>
            <p className="text-xs text-foreground-muted mt-1">Server Settings</p>
          </div>
          <nav className="flex-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background-surface text-foreground'
                    : 'text-foreground-muted hover:text-foreground hover:bg-background-surface/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          {isOwner && (
            <div className="p-2 border-t border-border">
              <button
                onClick={() => setActiveTab('overview')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-error hover:bg-error/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Server
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-lg">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <ServerOverviewTab server={server} isOwner={isOwner} onClose={onClose} />
            )}
            {activeTab === 'members' && (
              <ServerMembersTab serverId={serverId} isOwner={isOwner} />
            )}
            {activeTab === 'roles' && (
              <ServerRolesTab serverId={serverId} isOwner={isOwner} />
            )}
            {activeTab === 'invites' && (
              <ServerInvitesTab serverId={serverId} />
            )}
            {activeTab === 'webhooks' && (
              <WebhooksTab serverId={serverId} />
            )}
            {activeTab === 'audit' && (
              <AuditLogsTab serverId={serverId} />
            )}
            {activeTab === 'bans' && (
              <ServerBansTab serverId={serverId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
