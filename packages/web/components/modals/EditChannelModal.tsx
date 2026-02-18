'use client';

import { useState, useEffect } from 'react';
import { X, Hash, Volume2, Megaphone, Trash2, Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChannelStore, Channel } from '@/stores/channelStore';
import { apiClient } from '@/lib/api-client';

export default function EditChannelModal() {
  const { activeModal, closeModal } = useUIStore();
  const { updateChannel, removeChannel } = useChannelStore();
  const isOpen = activeModal.type === 'edit-channel';
  const editChannelData = activeModal.editChannelData;

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [nsfw, setNsfw] = useState(false);
  const [slowmode, setSlowmode] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channel = editChannelData?.channel;

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setTopic(channel.topic || '');
      setNsfw(channel.nsfw);
      setSlowmode(channel.rateLimitPerUser);
    }
  }, [channel]);

  if (!isOpen || !channel) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    const channelName = name.toLowerCase().replace(/\s+/g, '-');

    const response = await apiClient.updateChannel(channel.serverId, channel.id, {
      name: channelName,
      topic: topic || undefined,
      nsfw,
      rateLimitPerUser: slowmode,
    });

    if (response.success && response.data) {
      updateChannel(channel.id, {
        name: response.data.name,
        topic: response.data.topic,
        nsfw: response.data.nsfw,
        rateLimitPerUser: response.data.rateLimitPerUser,
      });
      closeModal();
    } else {
      setError(response.error?.message || 'Failed to update channel');
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    const response = await apiClient.deleteChannel(channel.serverId, channel.id);

    if (response.success) {
      removeChannel(channel.id);
      closeModal();
    } else {
      setError(response.error?.message || 'Failed to delete channel');
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setShowDeleteConfirm(false);
    setError(null);
    closeModal();
  };

  const getChannelIcon = (type: Channel['type']) => {
    switch (type) {
      case 'voice':
        return <Volume2 className="w-5 h-5 text-foreground-muted" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-foreground-muted" />;
      default:
        return <Hash className="w-5 h-5 text-foreground-muted" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background-elevated rounded-lg shadow-xl">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            {getChannelIcon(channel.type)}
            <h2 className="text-lg font-semibold">Edit Channel</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Channel Name */}
          <div>
            <label
              htmlFor="channel-name"
              className="block text-xs font-semibold text-foreground-muted uppercase mb-2"
            >
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
                {channel.type === 'voice' ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <Hash className="w-4 h-4" />
                )}
              </span>
              <input
                id="channel-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Topic (only for text channels) */}
          {channel.type === 'text' && (
            <>
              <div>
                <label
                  htmlFor="topic"
                  className="block text-xs font-semibold text-foreground-muted uppercase mb-2"
                >
                  Topic
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's this channel about?"
                  className="w-full px-3 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors"
                />
                <p className="mt-1 text-xs text-foreground-muted">
                  Topics are shown at the top of the channel
                </p>
              </div>

              {/* Slowmode */}
              <div>
                <label
                  htmlFor="slowmode"
                  className="block text-xs font-semibold text-foreground-muted uppercase mb-2"
                >
                  Slowmode
                </label>
                <select
                  id="slowmode"
                  value={slowmode}
                  onChange={(e) => setSlowmode(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value={0}>Off</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
              </div>

              {/* NSFW */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nsfw}
                  onChange={(e) => setNsfw(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-sm">NSFW Channel</span>
              </label>
            </>
          )}

          {/* Voice channel specific settings */}
          {channel.type === 'voice' && (
            <>
              <div>
                <label
                  htmlFor="bitrate"
                  className="block text-xs font-semibold text-foreground-muted uppercase mb-2"
                >
                  Bitrate
                </label>
                <select
                  id="bitrate"
                  value={channel.bitrate || 64000}
                  className="w-full px-3 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value={8000}>8 kbps</option>
                  <option value={16000}>16 kbps</option>
                  <option value={32000}>32 kbps</option>
                  <option value={64000}>64 kbps</option>
                  <option value={96000}>96 kbps</option>
                  <option value={128000}>128 kbps</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="userLimit"
                  className="block text-xs font-semibold text-foreground-muted uppercase mb-2"
                >
                  User Limit
                </label>
                <select
                  id="userLimit"
                  value={channel.userLimit || 0}
                  className="w-full px-3 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value={0}>No Limit</option>
                  {[1, 2, 3, 4, 5, 10, 15, 20, 25].map((n) => (
                    <option key={n} value={n}>
                      {n} users
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
              {error}
            </div>
          )}

          {/* Delete Channel Section */}
          <div className="pt-4 border-t border-border">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
                className="flex items-center gap-2 text-sm text-error hover:text-error/80 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Channel
              </button>
            ) : (
              <div className="p-3 rounded bg-error/10 border border-error/20">
                <p className="text-sm text-error mb-3">
                  Are you sure you want to delete <strong>#{channel.name}</strong>? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded text-sm bg-background-surface hover:bg-background transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded text-sm bg-error text-white hover:bg-error/80 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving || deleting}
              className="px-4 py-2 rounded text-sm font-medium text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving || deleting}
              className="px-4 py-2 rounded text-sm font-medium bg-accent text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
