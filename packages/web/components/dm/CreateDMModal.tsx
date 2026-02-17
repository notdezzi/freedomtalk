'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDMStore } from '@/stores/dmStore';
import { apiClient } from '@/lib/api-client';

interface CreateDMModalProps {
  onClose: () => void;
}

interface UserSearchResult {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

export default function CreateDMModal({ onClose }: CreateDMModalProps) {
  const router = useRouter();
  const { addChannel, setCurrentChannel, getDMWithUser } = useDMStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [isGroupDM, setIsGroupDM] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      const response = await apiClient.searchUsers(searchQuery.trim());

      if (response.success && response.data) {
        const users = response.data as unknown as { users: UserSearchResult[] };
        setSearchResults(users.users || []);
      } else {
        setSearchResults([]);
      }
      setSearching(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectUser = (user: UserSearchResult) => {
    if (isGroupDM) {
      // Add to selection for group DM
      if (!selectedUsers.find((u) => u.id === user.id)) {
        setSelectedUsers([...selectedUsers, user]);
      }
      setSearchQuery('');
      setSearchResults([]);
    } else {
      // Direct DM - create immediately
      handleCreateDM(user);
    }
  };

  const handleRemoveSelected = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleCreateDM = async (user: UserSearchResult) => {
    // Check if DM already exists
    const existingDM = getDMWithUser(user.id);
    if (existingDM) {
      setCurrentChannel(existingDM.id);
      router.push(`/app/dms/${existingDM.id}`);
      onClose();
      return;
    }

    setCreating(true);
    const response = await apiClient.createDM(user.id);

    if (response.success && response.data) {
      const channel = {
        id: response.data.id,
        type: response.data.type as 'dm' | 'group_dm',
        name: response.data.name,
        iconUrl: response.data.iconUrl,
        ownerId: response.data.ownerId,
        recipients: response.data.recipients.map((r) => ({
          id: r.id,
          username: r.username,
          displayName: r.displayName,
          avatar: r.avatar,
        })),
        lastMessageId: response.data.lastMessageId,
        lastMessageAt: response.data.lastMessageAt,
        createdAt: response.data.createdAt,
      };

      addChannel(channel);
      setCurrentChannel(channel.id);
      router.push(`/app/dms/${channel.id}`);
      onClose();
    }
    setCreating(false);
  };

  const handleCreateGroupDM = async () => {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    const response = await apiClient.createGroupDM(
      selectedUsers.map((u) => u.id),
      groupName || undefined
    );

    if (response.success && response.data) {
      const channel = {
        id: response.data.id,
        type: response.data.type as 'dm' | 'group_dm',
        name: response.data.name,
        iconUrl: response.data.iconUrl,
        ownerId: response.data.ownerId,
        recipients: response.data.recipients.map((r) => ({
          id: r.id,
          username: r.username,
          displayName: r.displayName,
          avatar: r.avatar,
        })),
        lastMessageId: response.data.lastMessageId,
        lastMessageAt: response.data.lastMessageAt,
        createdAt: response.data.createdAt,
      };

      addChannel(channel);
      setCurrentChannel(channel.id);
      router.push(`/app/dms/${channel.id}`);
      onClose();
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-background-elevated rounded-lg border border-border shadow-xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isGroupDM ? 'Create Group DM' : 'Select a Friend'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle between DM and Group DM */}
        <div className="px-4 py-2 border-b border-border flex gap-2">
          <button
            onClick={() => {
              setIsGroupDM(false);
              setSelectedUsers([]);
              setGroupName('');
            }}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              !isGroupDM
                ? 'bg-accent text-background'
                : 'bg-background-surface text-foreground-muted hover:text-foreground'
            }`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setIsGroupDM(true)}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              isGroupDM
                ? 'bg-accent text-background'
                : 'bg-background-surface text-foreground-muted hover:text-foreground'
            }`}
          >
            Group DM
          </button>
        </div>

        {/* Group DM name input */}
        {isGroupDM && (
          <div className="px-4 py-3 border-b border-border">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="w-full px-3 py-2 text-sm bg-background-surface rounded border border-border focus:border-accent focus:outline-none"
            />
          </div>
        )}

        {/* Selected users for group DM */}
        {isGroupDM && selectedUsers.length > 0 && (
          <div className="px-4 py-2 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1 px-2 py-1 bg-background-surface rounded border border-border"
                >
                  <span className="text-sm">{user.displayName || user.username}</span>
                  <button
                    onClick={() => handleRemoveSelected(user.id)}
                    className="text-foreground-muted hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isGroupDM ? 'Search users to add...' : 'Search for a friend...'}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-background-surface rounded border border-border focus:border-accent focus:outline-none"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-foreground-muted" />
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-60 overflow-y-auto px-4 pb-4">
          {searchResults.length > 0 ? (
            searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                disabled={selectedUsers.some((u) => u.id === user.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                  selectedUsers.some((u) => u.id === user.id)
                    ? 'bg-background-surface opacity-50 cursor-not-allowed'
                    : 'hover:bg-background-surface'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-background">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{user.displayName || user.username}</div>
                  {user.displayName && (
                    <div className="text-xs text-foreground-muted">{user.username}</div>
                  )}
                </div>
                {isGroupDM && !selectedUsers.some((u) => u.id === user.id) && (
                  <UserPlus className="w-4 h-4 text-foreground-muted" />
                )}
              </button>
            ))
          ) : searchQuery && !searching ? (
            <div className="text-center py-4 text-foreground-muted text-sm">
              No users found
            </div>
          ) : !searchQuery ? (
            <div className="text-center py-4 text-foreground-muted text-sm">
              Type to search for users
            </div>
          ) : null}
        </div>

        {/* Create Group DM Button */}
        {isGroupDM && selectedUsers.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={handleCreateGroupDM}
              disabled={creating || selectedUsers.length === 0}
              className="w-full py-2 px-4 bg-accent text-background rounded font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              Create Group ({selectedUsers.length + 1} members)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
