'use client';

import { AppShell } from '@/components/layout';
import { useFriends, useFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useRejectFriendRequest, useBlockedUsers, useRemoveFriend, useBlockUser } from '@/features/friends';
import { useCreateDM } from '@/features/dms';
import { useUIStore } from '@/stores';
import { Avatar, Button, Input } from '@/components/ui';
import { ContextMenu, type ContextMenuItem } from '@/components/common/context-menu';
import { useState, useCallback } from 'react';
import { Clock, Check, X, Search, MessageCircle, UserX, Ban, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/stores/toast-store';
import { useConfirmDialog } from '@/components/ui';

type TabType = 'online' | 'all' | 'pending' | 'blocked' | 'add';

interface Friend {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline: boolean;
  customStatus?: string;
  friendSince: string;
}

export default function AppPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendUsername, setAddFriendUsername] = useState('');
  const openModal = useUIStore((s) => s.openModal);
  const { confirm } = useConfirmDialog();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    friend: Friend | null;
  }>({ open: false, x: 0, y: 0, friend: null });

  // Fetch friends and requests
  const { data: friends = [], isLoading: friendsLoading } = useFriends();
  const { data: friendRequests, isLoading: requestsLoading } = useFriendRequests();
  const { data: blockedUsers = [] } = useBlockedUsers();

  // Mutations
  const sendFriendRequest = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const rejectFriendRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();
  const createDM = useCreateDM();

  // Filter friends based on search and online status
  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = searchQuery === '' ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesOnline = activeTab !== 'online' || friend.isOnline;
    return matchesSearch && matchesOnline;
  });

  const pendingRequests = friendRequests?.incoming || [];
  const sentRequests = friendRequests?.outgoing || [];

  const handleSendRequest = () => {
    if (addFriendUsername.trim()) {
      sendFriendRequest.mutate(addFriendUsername.trim());
      setAddFriendUsername('');
    }
  };

  const handleStartDM = (friendId: string) => {
    createDM.mutate(friendId, {
      onSuccess: (data) => {
        if (data?.id) {
          router.push(`/app/dms/${data.id}`);
        }
      },
    });
  };

  const handleFriendContextMenu = useCallback((e: React.MouseEvent, friend: Friend) => {
    e.preventDefault();
    setContextMenu({ open: true, x: e.clientX, y: e.clientY, friend });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

  const handleRemoveFriend = async (friend: Friend) => {
    const confirmed = await confirm({
      title: 'Remove Friend',
      message: `Are you sure you want to remove ${friend.displayName || friend.username} from your friends list?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      removeFriend.mutate(friend.userId, {
        onSuccess: () => {
          toast.success(`${friend.displayName || friend.username} has been removed from your friends list`);
          closeContextMenu();
        },
        onError: () => {
          toast.error('Failed to remove friend');
        },
      });
    }
  };

  const handleBlockFriend = async (friend: Friend) => {
    const confirmed = await confirm({
      title: 'Block User',
      message: `Are you sure you want to block ${friend.displayName || friend.username}? You won't receive messages from them anymore.`,
      confirmLabel: 'Block',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      blockUser.mutate(friend.userId, {
        onSuccess: () => {
          toast.success(`${friend.displayName || friend.username} has been blocked`);
          closeContextMenu();
        },
        onError: () => {
          toast.error('Failed to block user');
        },
      });
    }
  };

  const getFriendContextMenuItems = (): ContextMenuItem[] => {
    const friend = contextMenu.friend;
    if (!friend) return [];

    return [
      {
        id: 'message',
        label: 'Message',
        icon: <MessageCircle className="h-4 w-4" />,
        onClick: () => {
          handleStartDM(friend.id);
          closeContextMenu();
        },
      },
      {
        id: 'profile',
        label: 'View Profile',
        icon: <User className="h-4 w-4" />,
        onClick: () => {
          openModal('user-profile', { userId: friend.userId });
          closeContextMenu();
        },
      },
      { id: 'separator-1', label: '', separator: true },
      {
        id: 'remove',
        label: 'Remove Friend',
        icon: <UserX className="h-4 w-4" />,
        danger: true,
        onClick: () => handleRemoveFriend(friend),
      },
      {
        id: 'block',
        label: 'Block',
        icon: <Ban className="h-4 w-4" />,
        danger: true,
        onClick: () => handleBlockFriend(friend),
      },
    ];
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'add':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Add Friend</h2>
            <p className="text-foreground-muted text-sm mb-4">
              You can add friends by their username.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter a username"
                value={addFriendUsername}
                onChange={(e) => setAddFriendUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                className="flex-1"
              />
              <Button
                onClick={handleSendRequest}
                disabled={!addFriendUsername.trim() || sendFriendRequest.isPending}
              >
                Send Friend Request
              </Button>
            </div>
            {sendFriendRequest.isSuccess && (
              <p className="text-success mt-2">Friend request sent!</p>
            )}
            {sendFriendRequest.isError && (
              <p className="text-error mt-2">Failed to send friend request. User not found.</p>
            )}
          </div>
        );

      case 'pending':
        return (
          <div className="p-4">
            {requestsLoading ? (
              <div className="text-center text-foreground-muted py-8">Loading...</div>
            ) : pendingRequests.length === 0 && sentRequests.length === 0 ? (
              <div className="text-center text-foreground-muted py-8">
                No pending friend requests
              </div>
            ) : (
              <div className="space-y-6">
                {pendingRequests.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-foreground-subtle uppercase mb-2">
                      Incoming Requests — {pendingRequests.length}
                    </h3>
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-background-surface"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={request.avatarUrl ?? undefined}
                            alt={request.displayName || request.username}
                            size="md"
                          />
                          <div>
                            <p className="text-foreground font-medium">
                              {request.displayName || request.username}
                            </p>
                            <p className="text-foreground-muted text-sm">@{request.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => acceptFriendRequest.mutate(request.userId)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => rejectFriendRequest.mutate(request.userId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-foreground-subtle uppercase mb-2">
                      Outgoing Requests — {sentRequests.length}
                    </h3>
                    {sentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-background-surface"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={request.avatarUrl ?? undefined}
                            alt={request.displayName || request.username}
                            size="md"
                          />
                          <div>
                            <p className="text-foreground font-medium">
                              {request.displayName || request.username}
                            </p>
                            <p className="text-foreground-muted text-sm">@{request.username}</p>
                          </div>
                        </div>
                        <div className="text-foreground-muted text-sm flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Pending
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'blocked':
        return (
          <div className="p-4">
            {blockedUsers.length === 0 ? (
              <div className="text-center text-foreground-muted py-8">
                You haven't blocked anyone
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-semibold text-foreground-subtle uppercase mb-2">
                  Blocked Users — {blockedUsers.length}
                </h3>
                {blockedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-background-surface"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.avatarUrl ?? undefined}
                        alt={user.displayName || user.username}
                        size="md"
                      />
                      <p className="text-foreground font-medium">
                        {user.displayName || user.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-4">
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search friends"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background-surface text-foreground rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {friendsLoading ? (
              <div className="text-center text-foreground-muted py-8">Loading friends...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center text-foreground-muted py-8">
                {searchQuery
                  ? 'No friends match your search'
                  : 'No friends yet. Add some friends to get started!'}
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-semibold text-foreground-subtle uppercase mb-2">
                  All Friends — {filteredFriends.length}
                </h3>
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-background-surface"
                    onContextMenu={(e) => handleFriendContextMenu(e, friend as Friend)}
                  >
                    <button
                      className="flex items-center gap-3 flex-1 text-left"
                      onClick={() => handleStartDM(friend.id)}
                    >
                      <div className="relative">
                        <Avatar
                          src={friend.avatarUrl ?? undefined}
                          alt={friend.displayName || friend.username}
                          size="md"
                        />
                        {friend.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-background-surface" />
                        )}
                      </div>
                      <div>
                        <p className="text-foreground font-medium">
                          {friend.displayName || friend.username}
                        </p>
                        <p className="text-foreground-muted text-sm">
                          {friend.customStatus || (friend.isOnline ? 'Online' : `Friends since ${new Date(friend.friendSince).toLocaleDateString()}`)}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleStartDM(friend.id)}
                      className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-elevated rounded"
                      aria-label="Message"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <AppShell sectionName="Friends">
      <div className="flex h-full flex-col">
        {/* Friends list header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`font-medium ${
                activeTab === 'all' ? 'text-foreground' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`font-medium ${
                activeTab === 'online' ? 'text-foreground' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`font-medium flex items-center gap-1 ${
                activeTab === 'pending' ? 'text-foreground' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Pending
              {pendingRequests.length > 0 && (
                <span className="bg-error text-foreground text-xs rounded-full px-1.5">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`font-medium ${
                activeTab === 'blocked' ? 'text-foreground' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Blocked
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`font-medium ${
                activeTab === 'add' ? 'text-foreground' : 'text-success hover:text-success'
              }`}
            >
              Add Friend
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>

      {/* Friend Context Menu */}
      <ContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        items={getFriendContextMenuItems()}
        onClose={closeContextMenu}
      />
    </AppShell>
  );
}
