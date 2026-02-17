'use client';

import { useState, useRef } from 'react';
import { Camera, Mail, Key, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';

export default function AccountSettingsTab() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError(null);

    // Convert to base64 data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const avatarUrl = reader.result as string;

      const response = await apiClient.updateUserProfile({ avatar: avatarUrl });

      if (response.success) {
        setSuccess('Avatar updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error?.message || 'Failed to update avatar');
      }

      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);

    const response = await apiClient.changePassword(currentPassword, newPassword);

    if (response.success) {
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(response.error?.message || 'Failed to change password');
    }

    setSaving(false);
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded text-error text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-success/10 border border-success/20 rounded text-success text-sm">
          {success}
        </div>
      )}

      {/* User Info */}
      <div className="bg-background-surface rounded-lg border border-border p-4">
        <h4 className="font-semibold mb-4">User Information</h4>

        <div className="flex items-center gap-6 mb-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-background">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <p className="font-medium text-lg">{user.username}</p>
            <p className="text-sm text-foreground-muted">#{user.id.slice(-4)}</p>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled
            className="w-full px-3 py-2 bg-background rounded border border-border focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <p className="text-xs text-foreground-muted mt-1">
            Email cannot be changed at this time
          </p>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-background-surface rounded-lg border border-border p-4">
        <h4 className="font-semibold mb-4">
          <Key className="w-4 h-4 inline mr-2" />
          Change Password
        </h4>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-background rounded border border-border focus:border-accent focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground-muted hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background rounded border border-border focus:border-accent focus:outline-none"
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background rounded border border-border focus:border-accent focus:outline-none"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-accent text-background rounded font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
