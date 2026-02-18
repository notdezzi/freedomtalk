'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  User,
  Hash,
  Link2,
  Trash2,
  Settings,
  Edit2,
  PlusCircle,
  LogOut,
  ArrowLeft,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AuditLogEntry {
  id: string;
  server_id: string;
  user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AuditLogsTabProps {
  serverId: string;
}

// Action type to icon mapping
const actionIcons: Record<string, typeof Shield> = {
  // Server
  SERVER_UPDATE: Settings,
  SERVER_DELETE: Trash2,
  // Channel
  CHANNEL_CREATE: PlusCircle,
  CHANNEL_UPDATE: Edit2,
  CHANNEL_DELETE: Trash2,
  CHANNEL_OVERWRITE_CREATE: PlusCircle,
  CHANNEL_OVERWRITE_UPDATE: Edit2,
  CHANNEL_OVERWRITE_DELETE: Trash2,
  // Role
  ROLE_CREATE: PlusCircle,
  ROLE_UPDATE: Edit2,
  ROLE_DELETE: Trash2,
  // Member
  MEMBER_KICK: LogOut,
  MEMBER_BAN_ADD: Shield,
  MEMBER_BAN_REMOVE: Shield,
  MEMBER_UPDATE: Edit2,
  MEMBER_ROLE_UPDATE: Edit2,
  MEMBER_MOVE: LogOut,
  MEMBER_DISCONNECT: LogOut,
  // Message
  MESSAGE_DELETE: Trash2,
  MESSAGE_BULK_DELETE: Trash2,
  MESSAGE_PIN: Hash,
  MESSAGE_UNPIN: Hash,
  // Invite
  INVITE_CREATE: Link2,
  INVITE_DELETE: Trash2,
  // Webhook
  WEBHOOK_CREATE: PlusCircle,
  WEBHOOK_UPDATE: Edit2,
  WEBHOOK_DELETE: Trash2,
  // Emoji
  EMOJI_CREATE: PlusCircle,
  EMOJI_UPDATE: Edit2,
  EMOJI_DELETE: Trash2,
};

// Action type to color mapping
const actionColors: Record<string, string> = {
  // Create actions - green
  CHANNEL_CREATE: 'text-success',
  ROLE_CREATE: 'text-success',
  WEBHOOK_CREATE: 'text-success',
  INVITE_CREATE: 'text-success',
  EMOJI_CREATE: 'text-success',
  // Update actions - accent
  SERVER_UPDATE: 'text-accent',
  CHANNEL_UPDATE: 'text-accent',
  ROLE_UPDATE: 'text-accent',
  MEMBER_UPDATE: 'text-accent',
  WEBHOOK_UPDATE: 'text-accent',
  EMOJI_UPDATE: 'text-accent',
  // Delete/Kick/Ban actions - red
  CHANNEL_DELETE: 'text-error',
  ROLE_DELETE: 'text-error',
  MEMBER_KICK: 'text-error',
  MEMBER_BAN_ADD: 'text-error',
  WEBHOOK_DELETE: 'text-error',
  MESSAGE_DELETE: 'text-error',
  MESSAGE_BULK_DELETE: 'text-error',
  INVITE_DELETE: 'text-error',
  EMOJI_DELETE: 'text-error',
  // Special actions
  MEMBER_BAN_REMOVE: 'text-success',
  MESSAGE_PIN: 'text-secondary',
  MESSAGE_UNPIN: 'text-foreground-muted',
};

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    SERVER_UPDATE: 'Updated Server',
    SERVER_DELETE: 'Deleted Server',
    CHANNEL_CREATE: 'Created Channel',
    CHANNEL_UPDATE: 'Updated Channel',
    CHANNEL_DELETE: 'Deleted Channel',
    ROLE_CREATE: 'Created Role',
    ROLE_UPDATE: 'Updated Role',
    ROLE_DELETE: 'Deleted Role',
    MEMBER_KICK: 'Kicked Member',
    MEMBER_BAN_ADD: 'Banned Member',
    MEMBER_BAN_REMOVE: 'Unbanned Member',
    MEMBER_UPDATE: 'Updated Member',
    MEMBER_ROLE_UPDATE: 'Updated Member Roles',
    MESSAGE_DELETE: 'Deleted Message',
    MESSAGE_BULK_DELETE: 'Bulk Deleted Messages',
    MESSAGE_PIN: 'Pinned Message',
    MESSAGE_UNPIN: 'Unpinned Message',
    INVITE_CREATE: 'Created Invite',
    INVITE_DELETE: 'Deleted Invite',
    WEBHOOK_CREATE: 'Created Webhook',
    WEBHOOK_UPDATE: 'Updated Webhook',
    WEBHOOK_DELETE: 'Deleted Webhook',
    EMOJI_CREATE: 'Created Emoji',
    EMOJI_UPDATE: 'Updated Emoji',
    EMOJI_DELETE: 'Deleted Emoji',
  };
  return labels[actionType] || actionType;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function AuditLogsTab({ serverId }: AuditLogsTabProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState({
    actionType: '',
    userId: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [serverId, filter]);

  const fetchAuditLogs = async (before?: string) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filter.actionType) params.append('action_type', filter.actionType);
    if (filter.userId) params.append('user_id', filter.userId);
    if (before) params.append('before', before);
    params.append('limit', '50');

    const response = await apiClient.get<{ entries: AuditLogEntry[]; has_more: boolean }>(
      `/servers/${serverId}/audit-logs?${params.toString()}`
    );

    if (response.success && response.data) {
      const data = response.data as { entries: AuditLogEntry[]; has_more: boolean };
      if (before) {
        setEntries(prev => [...prev, ...data.entries]);
      } else {
        setEntries(data.entries);
      }
      setHasMore(data.has_more);
    } else {
      setError('Failed to fetch audit logs');
    }

    setLoading(false);
  };

  const loadMore = () => {
    if (entries.length > 0) {
      fetchAuditLogs(entries[entries.length - 1].id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Audit Logs
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            View a log of all administrative actions in this server
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn btn-ghost flex items-center gap-2 ${showFilters ? 'text-accent' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-background-surface rounded-lg border border-border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Action Type</label>
              <select
                value={filter.actionType}
                onChange={(e) => setFilter({ ...filter, actionType: e.target.value })}
                className="input"
              >
                <option value="">All Actions</option>
                <optgroup label="Channel">
                  <option value="CHANNEL_CREATE">Channel Created</option>
                  <option value="CHANNEL_UPDATE">Channel Updated</option>
                  <option value="CHANNEL_DELETE">Channel Deleted</option>
                </optgroup>
                <optgroup label="Role">
                  <option value="ROLE_CREATE">Role Created</option>
                  <option value="ROLE_UPDATE">Role Updated</option>
                  <option value="ROLE_DELETE">Role Deleted</option>
                </optgroup>
                <optgroup label="Member">
                  <option value="MEMBER_KICK">Member Kicked</option>
                  <option value="MEMBER_BAN_ADD">Member Banned</option>
                  <option value="MEMBER_BAN_REMOVE">Member Unbanned</option>
                </optgroup>
                <optgroup label="Webhook">
                  <option value="WEBHOOK_CREATE">Webhook Created</option>
                  <option value="WEBHOOK_UPDATE">Webhook Updated</option>
                  <option value="WEBHOOK_DELETE">Webhook Deleted</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">User ID</label>
              <input
                type="text"
                value={filter.userId}
                onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
                placeholder="Filter by user ID..."
                className="input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-sm text-error">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && entries.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-12 bg-background-surface rounded-lg border border-border">
          <Shield className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
          <h3 className="font-medium mb-2">No Audit Logs</h3>
          <p className="text-sm text-foreground-muted">
            No administrative actions have been recorded yet
          </p>
        </div>
      )}

      {/* Audit log entries */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => {
            const Icon = actionIcons[entry.action_type] || Shield;
            const colorClass = actionColors[entry.action_type] || 'text-foreground';

            return (
              <div
                key={entry.id}
                className="bg-background-surface rounded-lg border border-border p-4 hover:border-border-hover transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg bg-background ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${colorClass}`}>
                        {getActionLabel(entry.action_type)}
                      </span>
                      {entry.target_type && (
                        <span className="text-xs px-2 py-0.5 rounded bg-background text-foreground-muted">
                          {entry.target_type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-sm text-foreground-muted">
                      <User className="w-3 h-3" />
                      <span>{entry.user_id}</span>
                      {entry.target_id && (
                        <>
                          <span>→</span>
                          <span>{entry.target_id}</span>
                        </>
                      )}
                    </div>

                    {/* Reason */}
                    {entry.reason && (
                      <p className="mt-2 text-sm text-foreground-muted italic">
                        &quot;{entry.reason}&quot;
                      </p>
                    )}

                    {/* Changes diff */}
                    {entry.changes && (entry.changes.before || entry.changes.after) && (
                      <div className="mt-3 p-3 bg-background rounded border border-border text-xs font-mono">
                        {entry.changes.before && (
                          <div className="text-error mb-1">
                            - {JSON.stringify(entry.changes.before, null, 2)}
                          </div>
                        )}
                        {entry.changes.after && (
                          <div className="text-success">
                            + {JSON.stringify(entry.changes.after, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-foreground-muted whitespace-nowrap">
                    {formatTimeAgo(new Date(entry.created_at))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn btn-ghost"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ArrowDown className="w-4 h-4 mr-2" />
                Load More
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Import ArrowDown icon
function ArrowDown(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
