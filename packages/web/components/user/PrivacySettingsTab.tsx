'use client';

import { useState, useEffect } from 'react';
import { Shield, Loader2, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface PrivacySettings {
  allowDMsFromServerMembers: boolean;
  allowFriendRequests: boolean;
  explicitContentFilter: 'disabled' | 'excludeNonFriends' | 'all';
  dmScanLevel: 'disabled' | 'safe' | 'aggressive';
}

const defaultSettings: PrivacySettings = {
  allowDMsFromServerMembers: true,
  allowFriendRequests: true,
  explicitContentFilter: 'excludeNonFriends',
  dmScanLevel: 'safe',
};

export default function PrivacySettingsTab() {
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/users/me/privacy');
      if (response.success && response.data) {
        setSettings({ ...defaultSettings, ...response.data });
      }
    } catch {
      // Use defaults if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: PrivacySettings) => {
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.patch('/api/v1/users/me/privacy', newSettings);
      setSettings(newSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Handle error silently
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Privacy & Safety</h4>
          <p className="text-sm text-foreground-muted">Manage your privacy settings</p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saved && <span className="text-sm text-accent flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
      </div>

      {/* DM Settings */}
      <div className="card bg-background-surface space-y-4">
        <h5 className="font-medium text-sm uppercase text-foreground-muted">Direct Messages</h5>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Allow DMs from server members</p>
            <p className="text-xs text-foreground-muted">Allow members who share a server with you to send you direct messages</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowDMsFromServerMembers}
              onChange={(e) => updateSetting('allowDMsFromServerMembers', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Allow friend requests</p>
            <p className="text-xs text-foreground-muted">Allow other users to send you friend requests</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowFriendRequests}
              onChange={(e) => updateSetting('allowFriendRequests', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
      </div>

      {/* Content Filter */}
      <div className="card bg-background-surface space-y-4">
        <h5 className="font-medium text-sm uppercase text-foreground-muted">Content Safety</h5>

        <div>
          <p className="font-medium text-sm mb-2">Explicit content filter</p>
          <p className="text-xs text-foreground-muted mb-3">Scan and filter explicit content in DMs</p>
          <select
            value={settings.explicitContentFilter}
            onChange={(e) => updateSetting('explicitContentFilter', e.target.value as PrivacySettings['explicitContentFilter'])}
            className="input w-full max-w-xs"
          >
            <option value="disabled">Don't scan</option>
            <option value="excludeNonFriends">Scan from non-friends</option>
            <option value="all">Scan from everyone</option>
          </select>
        </div>

        <div>
          <p className="font-medium text-sm mb-2">DM scan level</p>
          <p className="text-xs text-foreground-muted mb-3">Level of scanning for suspicious content</p>
          <select
            value={settings.dmScanLevel}
            onChange={(e) => updateSetting('dmScanLevel', e.target.value as PrivacySettings['dmScanLevel'])}
            className="input w-full max-w-xs"
          >
            <option value="disabled">Disabled</option>
            <option value="safe">Safe (recommended)</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg bg-secondary-muted/10 border border-secondary-muted/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Your Privacy Matters</p>
            <p className="text-xs text-foreground-muted mt-1">
              These settings help protect your account and control who can contact you.
              Changes are saved automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
