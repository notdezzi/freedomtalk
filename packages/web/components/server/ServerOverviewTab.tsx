'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, Trash2, AlertTriangle, ImagePlus } from 'lucide-react';
import { useServerStore, Server } from '@/stores/serverStore';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface ServerOverviewTabProps {
  server: Server;
  isOwner: boolean;
  onClose: () => void;
}

export default function ServerOverviewTab({ server, isOwner, onClose }: ServerOverviewTabProps) {
  const router = useRouter();
  const { updateServer, removeServer } = useServerStore();
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || '');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!isOwner) return;

    setSaving(true);
    setError(null);

    const response = await apiClient.updateServer(server.id, {
      name,
      description: description || undefined,
    });

    if (response.success && response.data) {
      updateServer(server.id, {
        name: response.data.name,
        description: response.data.description,
      });
    } else {
      setError(response.error?.message || 'Failed to update server');
    }

    setSaving(false);
  };

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;

    setSaving(true);
    setError(null);

    // Convert to base64 data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const iconUrl = reader.result as string;

      const response = await apiClient.updateServer(server.id, { iconUrl });

      if (response.success && response.data) {
        const data = response.data as { icon_url?: string };
        updateServer(server.id, { icon: data.icon_url });
      } else {
        setError(response.error?.message || 'Failed to update icon');
      }

      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;

    setSaving(true);
    setError(null);

    // Convert to base64 data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const bannerUrl = reader.result as string;

      const response = await apiClient.updateServer(server.id, { bannerUrl });

      if (response.success && response.data) {
        const data = response.data as { banner_url?: string };
        updateServer(server.id, { banner: data.banner_url });
      } else {
        setError(response.error?.message || 'Failed to update banner');
      }

      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteServer = async () => {
    if (!isOwner || !deleteConfirm) return;

    setDeleting(true);
    setError(null);

    const response = await apiClient.deleteServer(server.id);

    if (response.success) {
      removeServer(server.id);
      onClose();
      router.push('/app');
    } else {
      setError(response.error?.message || 'Failed to delete server');
      setDeleting(false);
    }
  };

  const handleLeaveServer = async () => {
    setDeleting(true);
    setError(null);

    const response = await apiClient.leaveServer(server.id);

    if (response.success) {
      removeServer(server.id);
      onClose();
      router.push('/app');
    } else {
      setError(response.error?.message || 'Failed to leave server');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
          {error}
        </div>
      )}

      {/* Server Icon */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden">
            {server.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={server.icon} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-background">
                {server.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleIconChange}
            className="hidden"
          />
        </div>
        <div className="flex-1">
          <p className="text-xs text-foreground-muted mb-1">
            {server.memberCount} members
          </p>
          <p className="text-xs text-foreground-muted">
            Created {new Date(server.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Server Banner */}
      <div>
        <label className="block text-sm font-medium mb-2">Server Banner</label>
        <div className="relative group rounded-lg overflow-hidden bg-background-surface border border-border">
          {server.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={server.banner}
              alt="Server banner"
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 flex items-center justify-center bg-gradient-to-r from-background-surface to-background">
              <span className="text-sm text-foreground-muted">No banner set</span>
            </div>
          )}
          {isOwner && (
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ImagePlus className="w-8 h-8 text-white" />
              <span className="ml-2 text-white font-medium">Change Banner</span>
            </button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            className="hidden"
          />
        </div>
        <p className="text-xs text-foreground-muted mt-1">
          Recommended: 960x540 pixels (16:9 aspect ratio)
        </p>
      </div>

      {/* Server Name */}
      <div>
        <label className="block text-sm font-medium mb-2">Server Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isOwner}
          className="w-full px-3 py-2 bg-background-surface rounded border border-border focus:border-accent focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Server Description */}
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isOwner}
          rows={3}
          placeholder="No description set"
          className="w-full px-3 py-2 bg-background-surface rounded border border-border focus:border-accent focus:outline-none disabled:opacity-50 resize-none"
        />
      </div>

      {/* Save Button */}
      {isOwner && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || name === server.name}
            className="px-4 py-2 bg-accent text-background rounded font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      )}

      {/* Danger Zone */}
      <div className="border-t border-border pt-6 mt-6">
        <h4 className="text-sm font-semibold text-error mb-4">Danger Zone</h4>

        {isOwner ? (
          <div className="p-4 bg-error/5 border border-error/20 rounded">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-foreground">Delete Server</h5>
                <p className="text-sm text-foreground-muted mt-1">
                  Once you delete a server, there is no going back. Please be certain.
                </p>
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="mt-3 px-3 py-1.5 bg-error text-white rounded text-sm font-medium hover:bg-error/80 transition-colors"
                  >
                    Delete Server
                  </button>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleDeleteServer}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-error text-white rounded text-sm font-medium hover:bg-error/80 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-background-surface text-foreground rounded text-sm font-medium hover:bg-background-surface/80 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-error/5 border border-error/20 rounded">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-foreground">Leave Server</h5>
                <p className="text-sm text-foreground-muted mt-1">
                  You will no longer have access to this server.
                </p>
                <button
                  onClick={handleLeaveServer}
                  disabled={deleting}
                  className="mt-3 px-3 py-1.5 bg-warning text-background rounded text-sm font-medium hover:bg-warning/80 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Leave Server
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
