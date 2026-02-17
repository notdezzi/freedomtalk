'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Shield,
  Bell,
  Palette,
  Monitor,
  Mic,
  Key,
  Link2,
  Globe,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import AccountSettingsTab from './AccountSettingsTab';
import ProfileSettingsTab from './ProfileSettingsTab';
import AppearanceSettingsTab from './AppearanceSettingsTab';
import NotificationSettingsTab from './NotificationSettingsTab';
import PrivacySettingsTab from './PrivacySettingsTab';
import AuthorizedAppsTab from './AuthorizedAppsTab';
import DevicesTab from './DevicesTab';
import VoiceVideoTab from './VoiceVideoTab';

type TabType = 'account' | 'profile' | 'privacy' | 'apps' | 'devices' | 'appearance' | 'voice' | 'notifications';

interface Tab {
  id: TabType;
  label: string;
  icon: typeof User;
  group: 'user' | 'app';
}

const tabs: Tab[] = [
  { id: 'account', label: 'My Account', icon: User, group: 'user' },
  { id: 'profile', label: 'User Profile', icon: User, group: 'user' },
  { id: 'privacy', label: 'Privacy & Safety', icon: Shield, group: 'user' },
  { id: 'apps', label: 'Authorized Apps', icon: Key, group: 'user' },
  { id: 'devices', label: 'Devices', icon: Monitor, group: 'user' },
  { id: 'appearance', label: 'Appearance', icon: Palette, group: 'app' },
  { id: 'voice', label: 'Voice & Video', icon: Mic, group: 'app' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'app' },
];

export default function UserSettingsModal() {
  const { activeModal, closeModal } = useUIStore();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = activeModal.type === 'user-settings';

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeModal();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeModal]);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) return;
    await logout();
    closeModal();
  };

  if (!isOpen || !user) return null;

  const userTabs = tabs.filter((t) => t.group === 'user');
  const appTabs = tabs.filter((t) => t.group === 'app');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-background-elevated rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex overflow-hidden"
      >
        {/* Sidebar */}
        <div className="w-56 bg-background flex flex-col border-r border-border">
          {/* User Info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-background">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.username}</p>
                <p className="text-xs text-foreground-muted">#{user.id.slice(-4)}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold text-foreground-muted uppercase">
                User Settings
              </p>
              {userTabs.map((tab) => (
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
            </div>

            <div>
              <p className="px-2 py-1 text-xs font-semibold text-foreground-muted uppercase">
                App Settings
              </p>
              {appTabs.map((tab) => (
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
            </div>
          </nav>

          {/* Logout */}
          <div className="p-2 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-error hover:bg-error/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-lg">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={closeModal}
              className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'account' && <AccountSettingsTab />}
            {activeTab === 'profile' && <ProfileSettingsTab />}
            {activeTab === 'appearance' && <AppearanceSettingsTab />}
            {activeTab === 'notifications' && <NotificationSettingsTab />}
            {activeTab === 'privacy' && <PrivacySettingsTab />}
            {activeTab === 'apps' && <AuthorizedAppsTab />}
            {activeTab === 'devices' && <DevicesTab />}
            {activeTab === 'voice' && <VoiceVideoTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
