'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';

export default function ProfileSettingsTab() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [aboutMe, setAboutMe] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const response = await apiClient.updateUserProfile({
      displayName: displayName || undefined,
      aboutMe: aboutMe || undefined,
    });

    if (response.success) {
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(response.error?.message || 'Failed to update profile');
    }

    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const avatarUrl = reader.result as string;
      const response = await apiClient.updateUserProfile({ avatar: avatarUrl });

      if (response.success) {
        setSuccess('Avatar updated');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error?.message || 'Failed to update avatar');
      }
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const bannerUrl = reader.result as string;
      const response = await apiClient.updateUserProfile({ banner: bannerUrl });

      if (response.success) {
        setSuccess('Banner updated');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error?.message || 'Failed to update banner');
      }
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-success/10 border border-success/20 rounded text-success text-sm">
          {success}
        </div>
      )}

      {/* Banner & Avatar */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Banner */}
        <div
          className="h-32 bg-gradient-to-r from-accent to-secondary relative group cursor-pointer"
          onClick={() => bannerInputRef.current?.click()}
        >
          {user.banner && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.banner}
              alt=""
              className="w-full h-full object-cover absolute inset-0"
            />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ImageIcon className="w-8 h-8 text-white" />
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            className="hidden"
          />
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-10 relative z-10">
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-secondary border-4 border-background-elevated flex items-center justify-center overflow-hidden relative group cursor-pointer"
            onClick={() => avatarInputRef.current?.click()}
          >
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-background">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Username */}
        <div className="p-4 pt-2">
          <p className="font-semibold text-lg">{displayName || user.username}</p>
          <p className="text-sm text-foreground-muted">@{user.username}#{user.id.slice(-4)}</p>
        </div>
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium mb-2">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={user.username}
          className="w-full px-3 py-2 bg-background-surface rounded border border-border focus:border-accent focus:outline-none"
          maxLength={32}
        />
        <p className="text-xs text-foreground-muted mt-1">
          This is how your name will appear to others
        </p>
      </div>

      {/* About Me */}
      <div>
        <label className="block text-sm font-medium mb-2">About Me</label>
        <textarea
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="Tell us about yourself..."
          rows={4}
          className="w-full px-3 py-2 bg-background-surface rounded border border-border focus:border-accent focus:outline-none resize-none"
          maxLength={190}
        />
        <p className="text-xs text-foreground-muted mt-1">
          {aboutMe.length}/190 characters
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-accent text-background rounded font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
