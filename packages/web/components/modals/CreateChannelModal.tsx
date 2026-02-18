'use client';

import { useState } from 'react';
import { X, Hash, Volume2, Megaphone, Lock, Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChannelStore, ChannelType } from '@/stores/channelStore';
import { apiClient } from '@/lib/api-client';

const channelTypes: { value: ChannelType; label: string; icon: typeof Hash; description: string }[] = [
  {
    value: 'text',
    label: 'Text',
    icon: Hash,
    description: 'Send messages, images, and files',
  },
  {
    value: 'voice',
    label: 'Voice',
    icon: Volume2,
    description: 'Hang out with voice and video',
  },
  {
    value: 'announcement',
    label: 'Announcement',
    icon: Megaphone,
    description: 'Share important updates with everyone',
  },
];

export default function CreateChannelModal() {
  const { activeModal, closeModal } = useUIStore();
  const { addChannel, categories } = useChannelStore();
  const isOpen = activeModal.type === 'create-channel';
  const createChannelData = activeModal.createChannelData;

  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('text');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [nsfw, setNsfw] = useState(false);
  const [slowmode, setSlowmode] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !createChannelData) return null;

  const serverCategories = Object.values(categories).filter(
    (cat) => cat.serverId === createChannelData.serverId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    const channelName = name.toLowerCase().replace(/\s+/g, '-');

    const response = await apiClient.createChannel(createChannelData.serverId, {
      name: channelName,
      type,
      categoryId: categoryId || undefined,
      topic: topic || undefined,
      nsfw,
      rateLimitPerUser: slowmode,
      bitrate: type === 'voice' ? 64000 : undefined,
      userLimit: type === 'voice' ? 0 : undefined,
    });

    if (response.success && response.data) {
      addChannel({
        id: response.data.id,
        serverId: response.data.serverId || createChannelData.serverId,
        categoryId: response.data.categoryId || null,
        name: response.data.name,
        type: response.data.type as ChannelType,
        topic: response.data.topic,
        position: response.data.position,
        nsfw: response.data.nsfw,
        rateLimitPerUser: response.data.rateLimitPerUser,
        bitrate: response.data.bitrate,
        userLimit: response.data.userLimit,
      });

      // Reset form
      setName('');
      setType('text');
      setCategoryId(null);
      setTopic('');
      setNsfw(false);
      setSlowmode(0);
      setIsPrivate(false);
      closeModal();
    } else {
      setError(response.error?.message || 'Failed to create channel');
    }

    setSaving(false);
  };

  const handleClose = () => {
    setName('');
    setType('text');
    setCategoryId(null);
    setTopic('');
    setNsfw(false);
    setSlowmode(0);
    setIsPrivate(false);
    setError(null);
    closeModal();
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
          <h2 className="text-lg font-semibold">Create Channel</h2>
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
          {/* Channel Type */}
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase mb-2">
              Channel Type
            </label>
            <div className="space-y-2">
              {channelTypes.map((ct) => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setType(ct.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      type === ct.value
                        ? 'border-accent bg-accent-muted'
                        : 'border-border hover:border-accent-muted hover:bg-background-surface'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${type === ct.value ? 'text-accent' : 'text-foreground-muted'}`} />
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${type === ct.value ? 'text-accent' : ''}`}>
                        {ct.label}
                      </p>
                      <p className="text-xs text-foreground-muted">{ct.description}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        type === ct.value
                          ? 'border-accent bg-accent'
                          : 'border-foreground-muted'
                      }`}
                    >
                      {type === ct.value && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
                {type === 'voice' ? <Volume2 className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
              </span>
              <input
                id="channel-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'voice' ? 'new-channel' : 'new-channel'}
                className="w-full pl-9 pr-4 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Category */}
          {serverCategories.length > 0 && (
            <div>
              <label
                htmlFor="category"
                className="block text-xs font-semibold text-foreground-muted uppercase mb-2"
              >
                Category
              </label>
              <select
                id="category"
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="">No Category</option>
                {serverCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Private Channel Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg bg-background-surface cursor-pointer hover:bg-background">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent focus:ring-offset-0"
            />
            <div className="flex-1">
              <p className="font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Private Channel
              </p>
              <p className="text-xs text-foreground-muted">
                Only selected members and roles can view this channel
              </p>
            </div>
          </label>

          {/* Advanced Settings (only for text) */}
          {type === 'text' && (
            <>
              {/* Topic */}
              <div>
                <label
                  htmlFor="topic"
                  className="block text-xs font-semibold text-foreground-muted uppercase mb-2"
                >
                  Topic (Optional)
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's this channel about?"
                  className="w-full px-3 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors"
                />
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

          {/* Error */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 rounded text-sm font-medium text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-4 py-2 rounded text-sm font-medium bg-accent text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
