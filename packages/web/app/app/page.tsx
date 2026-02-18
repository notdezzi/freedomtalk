'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, Users, Search, Plus, Clock, Ban, X, Check, Send, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFriendStore, type Friend, type PendingFriendRequest, type BlockedUser, type SearchedUser } from '@/stores/friendStore';
import { useDMStore } from '@/stores/dmStore';

type TabType = 'online' | 'all' | 'pending' | 'blocked' | 'add-friend';

function FriendsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const friendStore = useFriendStore();
  const friends = friendStore?.friends ?? [];
  const incomingRequests = friendStore?.incomingRequests ?? [];
  const outgoingRequests = friendStore?.outgoingRequests ?? [];
  const blockedUsers = friendStore?.blockedUsers ?? [];
  const loading = friendStore?.loading ?? false;
  const error = friendStore?.error ?? null;
  const { fetchFriends, fetchPendingRequests, fetchBlockedUsers,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
    cancelFriendRequest, removeFriend, blockUser, unblockUser, searchUsers } = friendStore;
  const { getDMWithUser, addChannel } = useDMStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [addFriendUsername, setAddFriendUsername] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && fetchFriends) {
      fetchFriends();
      fetchPendingRequests();
      fetchBlockedUsers();
    }
  }, [isAuthenticated, fetchFriends, fetchPendingRequests, fetchBlockedUsers]);

  // Handle add-friend query param
  useEffect(() => {
    if (searchParams.get('add-friend') === 'true') {
      setActiveTab('add-friend');
    }
  }, [searchParams]);

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2 && activeTab !== 'add-friend' && searchUsers) {
        setSearching(true);
        const results = await searchUsers(searchQuery);
        setSearchResults(results ?? []);
        setSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers, activeTab]);

  const handleSendRequest = async (targetUserId: string) => {
    if (!sendFriendRequest) return;
    const success = await sendFriendRequest(targetUserId);
    if (success) {
      setSearchResults(results => results.map(u =>
        u.id === targetUserId ? { ...u, hasPendingRequest: true } : u
      ));
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (acceptFriendRequest) {
      await acceptFriendRequest(requesterId);
    }
  };

  const handleRejectRequest = async (requesterId: string) => {
    if (rejectFriendRequest) {
      await rejectFriendRequest(requesterId);
    }
  };

  const handleCancelRequest = async (targetUserId: string) => {
    if (cancelFriendRequest) {
      await cancelFriendRequest(targetUserId);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (confirm('Are you sure you want to remove this friend?') && removeFriend) {
      await removeFriend(friendId);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    if (confirm('Are you sure you want to block this user?') && blockUser) {
      await blockUser(targetUserId);
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    if (unblockUser) {
      await unblockUser(targetUserId);
    }
  };

  const handleStartDM = async (friend: Friend) => {
    const existingDM = getDMWithUser(friend.id);
    if (existingDM) {
      router.push(`/app/dms/${existingDM.id}`);
    } else {
      // Create DM channel through the API
      try {
        const { apiClient } = await import('@/lib/api-client');
        const response = await apiClient.createDM(friend.id);
        if (response.success && response.data) {
          const channel = {
            id: response.data.id,
            type: response.data.type as 'dm' | 'group_dm',
            name: response.data.name,
            iconUrl: response.data.iconUrl,
            ownerId: response.data.ownerId,
            recipients: (response.data.recipients || []).map((r: { id: string; username: string; displayName?: string; avatar?: string }) => ({
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
          router.push(`/app/dms/${channel.id}`);
        }
      } catch (error) {
        console.error('Failed to create DM:', error);
      }
    }
  };

  const handleAddFriendByUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    if (!addFriendUsername.trim()) {
      setAddError('Please enter a username');
      return;
    }

    if (!searchUsers) {
      setAddError('Service not available. Please try again.');
      return;
    }

    const results = await searchUsers(addFriendUsername.trim());

    if (!results || results.length === 0) {
      setAddError('User not found');
      return;
    }

    const targetUser = results[0];
    if (targetUser.isFriend) {
      setAddError('You are already friends with this user');
      return;
    }

    if (targetUser.hasPendingRequest) {
      setAddError('A friend request is already pending');
      return;
    }

    if (targetUser.isBlocked) {
      setAddError('You have blocked this user');
      return;
    }

    const success = await sendFriendRequest(targetUser.id);
    if (success) {
      setAddSuccess(`Friend request sent to ${targetUser.username}`);
      setAddFriendUsername('');
    } else {
      setAddError('Failed to send friend request');
    }
  };

  // Filter online friends (placeholder - would need presence data)
  const onlineFriends = friends; // For now, show all friends
  const totalPending = incomingRequests.length + outgoingRequests.length;

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border shadow-md">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-accent" />
          <span className="font-semibold">Friends</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'online'
                ? 'bg-background-surface text-foreground'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-surface'
            }`}
          >
            Online
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-background-surface text-foreground'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-surface'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-background-surface text-foreground'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-surface'
            }`}
          >
            Pending
            {totalPending > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-accent text-background rounded-full">
                {totalPending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'blocked'
                ? 'bg-background-surface text-foreground'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-surface'
            }`}
          >
            Blocked
          </button>
          <button
            onClick={() => setActiveTab('add-friend')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'add-friend'
                ? 'bg-accent text-background'
                : 'text-accent hover:bg-accent-muted'
            }`}
          >
            Add Friend
          </button>
        </nav>
        {activeTab !== 'add-friend' && (
          <div className="ml-auto relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 h-7 pl-8 pr-2 rounded text-sm bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors"
              placeholder="Search friends..."
            />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <>
            {/* Add Friend Tab */}
            {activeTab === 'add-friend' && (
              <div className="p-6">
                <div className="max-w-xl mx-auto">
                  <h2 className="text-xl font-bold mb-2">Add Friend</h2>
                  <p className="text-foreground-muted mb-4">
                    You can add friends by searching their username.
                  </p>
                  <form onSubmit={handleAddFriendByUsername} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={addFriendUsername}
                        onChange={(e) => {
                          setAddFriendUsername(e.target.value);
                          setAddError(null);
                          setAddSuccess(null);
                        }}
                        className="w-full h-10 px-3 rounded bg-background-surface border border-border focus:border-accent focus:outline-none"
                        placeholder="Enter a username"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!addFriendUsername.trim() || loading}
                      className="px-4 h-10 bg-accent text-background rounded font-medium hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send Friend Request
                    </button>
                  </form>
                  {addError && (
                    <p className="mt-2 text-sm text-red-500">{addError}</p>
                  )}
                  {addSuccess && (
                    <p className="mt-2 text-sm text-green-500">{addSuccess}</p>
                  )}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchQuery.length >= 2 && activeTab !== 'add-friend' && (
              <div className="p-4">
                <h3 className="text-xs font-semibold text-foreground-muted uppercase mb-2">
                  Search Results
                </h3>
                {searching ? (
                  <p className="text-foreground-muted">Searching...</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-foreground-muted">No users found</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-background-surface"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-background">
                            {result.avatarUrl ? (
                              <img src={result.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              result.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{result.displayName || result.username}</p>
                            <p className="text-xs text-foreground-muted">{result.username}</p>
                          </div>
                        </div>
                        <div>
                          {result.isFriend ? (
                            <span className="text-xs text-green-500">Friends</span>
                          ) : result.isBlocked ? (
                            <span className="text-xs text-red-500">Blocked</span>
                          ) : result.hasPendingRequest ? (
                            <span className="text-xs text-yellow-500">Pending</span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(result.id)}
                              className="px-3 py-1 text-xs bg-accent text-background rounded hover:bg-accent-dark transition-colors"
                            >
                              Add Friend
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Online Friends */}
            {activeTab === 'online' && !searchQuery && (
              <div className="p-4">
                <h3 className="text-xs font-semibold text-foreground-muted uppercase mb-2">
                  Online — {onlineFriends.length}
                </h3>
                {onlineFriends.length === 0 ? (
                  <p className="text-foreground-muted text-center py-8">
                    No friends online
                  </p>
                ) : (
                  <FriendList
                    friends={onlineFriends}
                    onMessage={handleStartDM}
                    onRemove={handleRemoveFriend}
                    onBlock={handleBlockUser}
                  />
                )}
              </div>
            )}

            {/* All Friends */}
            {activeTab === 'all' && !searchQuery && (
              <div className="p-4">
                <h3 className="text-xs font-semibold text-foreground-muted uppercase mb-2">
                  All Friends — {friends.length}
                </h3>
                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-background-surface flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-foreground-subtle" />
                    </div>
                    <h3 className="font-semibold mb-2">No friends yet</h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      Add friends to start chatting with them
                    </p>
                    <button
                      onClick={() => setActiveTab('add-friend')}
                      className="btn btn-primary"
                    >
                      <Plus className="w-4 h-4" />
                      Add Friend
                    </button>
                  </div>
                ) : (
                  <FriendList
                    friends={friends}
                    onMessage={handleStartDM}
                    onRemove={handleRemoveFriend}
                    onBlock={handleBlockUser}
                  />
                )}
              </div>
            )}

            {/* Pending Requests */}
            {activeTab === 'pending' && !searchQuery && (
              <div className="p-4">
                {incomingRequests.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold text-foreground-muted uppercase mb-2">
                      Incoming — {incomingRequests.length}
                    </h3>
                    <div className="space-y-1 mb-4">
                      {incomingRequests.map((request) => (
                        <PendingRequestItem
                          key={request.id}
                          request={request}
                          type="incoming"
                          onAccept={handleAcceptRequest}
                          onReject={handleRejectRequest}
                        />
                      ))}
                    </div>
                  </>
                )}

                {outgoingRequests.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold text-foreground-muted uppercase mb-2">
                      Outgoing — {outgoingRequests.length}
                    </h3>
                    <div className="space-y-1">
                      {outgoingRequests.map((request) => (
                        <PendingRequestItem
                          key={request.id}
                          request={request}
                          type="outgoing"
                          onCancel={handleCancelRequest}
                        />
                      ))}
                    </div>
                  </>
                )}

                {totalPending === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-background-surface flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-foreground-subtle" />
                    </div>
                    <h3 className="font-semibold mb-2">No pending requests</h3>
                    <p className="text-sm text-foreground-muted">
                      There are no pending friend requests
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Blocked Users */}
            {activeTab === 'blocked' && !searchQuery && (
              <div className="p-4">
                <h3 className="text-xs font-semibold text-foreground-muted uppercase mb-2">
                  Blocked — {blockedUsers.length}
                </h3>
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-background-surface flex items-center justify-center mx-auto mb-4">
                      <Ban className="w-8 h-8 text-foreground-subtle" />
                    </div>
                    <h3 className="font-semibold mb-2">No blocked users</h3>
                    <p className="text-sm text-foreground-muted">
                      You haven&apos;t blocked anyone yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {blockedUsers.map((blocked) => (
                      <BlockedUserItem
                        key={blocked.id}
                        user={blocked}
                        onUnblock={handleUnblockUser}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Friend list component
function FriendList({
  friends,
  onMessage,
  onRemove,
  onBlock,
}: {
  friends: Friend[];
  onMessage: (friend: Friend) => void;
  onRemove: (friendId: string) => void;
  onBlock: (userId: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center justify-between p-2 rounded hover:bg-background-surface group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-background">
              {friend.avatarUrl ? (
                <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                friend.username.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-medium">{friend.displayName || friend.username}</p>
              <p className="text-xs text-foreground-muted">
                {friend.customStatus || friend.username}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onMessage(friend)}
              className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground"
              title="Message"
            >
              <Send className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === friend.id ? null : friend.id)}
                className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {openMenu === friend.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenMenu(null)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-background-surface border border-border rounded shadow-lg z-20">
                    <button
                      onClick={() => {
                        onRemove(friend.id);
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-background text-red-400 hover:text-red-300"
                    >
                      Remove Friend
                    </button>
                    <button
                      onClick={() => {
                        onBlock(friend.id);
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-background text-red-400 hover:text-red-300"
                    >
                      Block
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Pending request item component
function PendingRequestItem({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
}: {
  request: PendingFriendRequest;
  type: 'incoming' | 'outgoing';
  onAccept?: (requesterId: string) => void;
  onReject?: (requesterId: string) => void;
  onCancel?: (targetUserId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-background-surface">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-background">
          {request.avatarUrl ? (
            <img src={request.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            request.username.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="font-medium">{request.displayName || request.username}</p>
          <p className="text-xs text-foreground-muted">{request.username}</p>
        </div>
      </div>
      {type === 'incoming' ? (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAccept?.(request.userId)}
            className="p-1.5 rounded bg-green-600 hover:bg-green-700 text-white"
            title="Accept"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => onReject?.(request.userId)}
            className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white"
            title="Reject"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onCancel?.(request.userId)}
          className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-background-surface rounded"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// Blocked user item component
function BlockedUserItem({
  user,
  onUnblock,
}: {
  user: BlockedUser;
  onUnblock: (userId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-background-surface">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-600/30 flex items-center justify-center text-sm font-bold text-red-400">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover opacity-50" />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="font-medium line-through opacity-50">{user.displayName || user.username}</p>
          <p className="text-xs text-foreground-muted">{user.username}</p>
        </div>
      </div>
      <button
        onClick={() => onUnblock(user.id)}
        className="px-3 py-1.5 text-sm bg-background-surface hover:bg-background text-foreground-muted hover:text-foreground rounded"
      >
        Unblock
      </button>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FriendsPageContent />
    </Suspense>
  );
}
