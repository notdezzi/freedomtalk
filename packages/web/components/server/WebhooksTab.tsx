'use client';

import { useState, useEffect } from 'react';
import {
  Webhook,
  Plus,
  Copy,
  RefreshCw,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useChannelStore, type Channel } from '@/stores/channelStore';

interface WebhookData {
  id: string;
  server_id: string;
  channel_id: string;
  name: string;
  avatar: string | null;
  token: string;
  created_by: string;
  created_at: string;
}

interface WebhooksTabProps {
  serverId: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

export default function WebhooksTab({ serverId }: WebhooksTabProps) {
  const { channels, serverChannels, fetchChannels } = useChannelStore();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhooks();
    // Ensure channels are loaded
    if (!serverChannels[serverId]) {
      fetchChannels(serverId);
    }
  }, [serverId]);

  const fetchWebhooks = async () => {
    setLoading(true);
    setError(null);
    const response = await apiClient.get<WebhookData[]>(`/servers/${serverId}/webhooks`);
    if (response.success && response.data) {
      setWebhooks(response.data as WebhookData[]);
    } else {
      setError(getErrorMessage(response.error, 'Failed to fetch webhooks'));
    }
    setLoading(false);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return;
    }

    const response = await apiClient.delete(`/servers/${serverId}/webhooks/${webhookId}`);
    if (response.success) {
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
    } else {
      setError(getErrorMessage(response.error, 'Failed to delete webhook'));
    }
  };

  const handleRegenerateToken = async (webhookId: string) => {
    if (!confirm('Regenerating the token will invalidate the old webhook URL. Continue?')) {
      return;
    }

    const response = await apiClient.post<{ token: string }>(`/servers/${serverId}/webhooks/${webhookId}/regenerate`);
    if (response.success && response.data) {
      const data = response.data as { token: string };
      const webhookUrl = `${window.location.origin}/api/v1/webhooks/${webhookId}/${data.token}`;
      await copyToClipboard(webhookUrl, webhookId);
      fetchWebhooks();
    } else {
      setError(getErrorMessage(response.error, 'Failed to regenerate token'));
    }
  };

  const getChannelName = (channelId: string) => {
    const channel = channels[channelId];
    return channel?.name || 'Unknown Channel';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Webhooks
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            Create and manage webhooks to send automated messages to your channels
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Webhook
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Webhooks list */}
      {webhooks.length === 0 ? (
        <div className="text-center py-12 bg-background-surface rounded-lg border border-border">
          <Webhook className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
          <h3 className="font-medium mb-2">No Webhooks</h3>
          <p className="text-sm text-foreground-muted mb-4">
            Create a webhook to send automated messages to your server
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-secondary"
          >
            Create Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-background-surface rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Webhook avatar */}
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    {webhook.avatar ? (
                      <img
                        src={webhook.avatar}
                        alt={webhook.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <Webhook className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{webhook.name}</h3>
                    <p className="text-sm text-foreground-muted">
                      #{getChannelName(webhook.channel_id)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingWebhook(webhook)}
                    className="p-2 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
                    title="Edit webhook"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRegenerateToken(webhook.id)}
                    className="p-2 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
                    title="Regenerate token"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 rounded hover:bg-background text-foreground-muted hover:text-error transition-colors"
                    title="Delete webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="mt-4">
                <label className="text-xs text-foreground-muted uppercase font-medium">Webhook URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-background px-3 py-2 rounded border border-border truncate">
                    {window.location.origin}/api/v1/webhooks/{webhook.id}/{webhook.token}
                  </code>
                  <button
                    onClick={() => copyToClipboard(
                      `${window.location.origin}/api/v1/webhooks/${webhook.id}/${webhook.token}`,
                      webhook.id
                    )}
                    className="p-2 rounded bg-background-surface border border-border hover:border-accent transition-colors"
                    title="Copy URL"
                  >
                    {copiedId === webhook.id ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Created info */}
              <div className="mt-3 flex items-center gap-4 text-xs text-foreground-muted">
                <span>Created: {new Date(webhook.created_at).toLocaleDateString()}</span>
                <span>ID: {webhook.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingWebhook) && (
        <WebhookModal
          serverId={serverId}
          webhook={editingWebhook}
          onClose={() => {
            setShowCreateModal(false);
            setEditingWebhook(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingWebhook(null);
            fetchWebhooks();
          }}
        />
      )}
    </div>
  );
}

// Webhook Create/Edit Modal
interface WebhookModalProps {
  serverId: string;
  webhook: WebhookData | null;
  onClose: () => void;
  onSave: () => void;
}

function WebhookModal({ serverId, webhook, onClose, onSave }: WebhookModalProps) {
  const { channels, serverChannels, fetchChannels } = useChannelStore();
  const [name, setName] = useState(webhook?.name || '');
  const [channelId, setChannelId] = useState(webhook?.channel_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  const isEditing = !!webhook;

  useEffect(() => {
    // Ensure channels are loaded
    if (!serverChannels[serverId]) {
      fetchChannels(serverId);
    }
  }, [serverId]);

  const serverChannelIds = serverChannels[serverId] || [];
  const serverChannelsList: Channel[] = serverChannelIds
    .map(id => channels[id])
    .filter((c): c is Channel => c !== undefined && c.type !== 'category');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !channelId) {
      setError('Name and channel are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        const response = await apiClient.patch(`/servers/${serverId}/webhooks/${webhook.id}`, {
          name: name.trim(),
          channel_id: channelId,
        });
        if (!response.success) {
          setError(getErrorMessage(response.error, 'Failed to update webhook'));
          return;
        }
      } else {
        const response = await apiClient.post<{ token: string }>(`/servers/${serverId}/webhooks`, {
          name: name.trim(),
          channel_id: channelId,
        });
        if (!response.success) {
          setError(getErrorMessage(response.error, 'Failed to create webhook'));
          return;
        }
        if (response.data) {
          const data = response.data as { id?: string; token: string };
          setNewToken(data.token);
        }
      }
      onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-elevated rounded-lg w-full max-w-md p-6 animate-slide-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            {isEditing ? 'Edit Webhook' : 'Create Webhook'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {newToken && (
          <div className="mb-4 p-4 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm text-success font-medium mb-2">Webhook Created!</p>
            <p className="text-xs text-foreground-muted mb-2">
              Copy this URL now - you won&apos;t be able to see it again:
            </p>
            <code className="block text-xs bg-background p-2 rounded border border-border break-all">
              {window.location.origin}/api/v1/webhooks/{webhook?.id || 'new'}/{newToken}
            </code>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Webhook"
              className="input"
              maxLength={80}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Channel</label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="input"
            >
              <option value="">Select a channel</option>
              {serverChannelsList.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  # {channel.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !channelId}
              className="btn btn-primary"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Webhook'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
