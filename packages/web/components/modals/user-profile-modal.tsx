'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { ProfilePanel } from '@/components/user';
import { apiClient } from '@/lib/api-client';
import { useServerMembers } from '@/features/servers';

interface UserProfileModalProps {
  userId: string;
  serverId?: string;
  onClose: () => void;
}

export function UserProfileModal({ userId, serverId, onClose }: UserProfileModalProps) {
  // Fetch user data from API
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => apiClient.getUser(userId),
    enabled: !!userId,
  });

  // Fetch friendship status
  const { data: friendshipResponse } = useQuery({
    queryKey: ['friendship-status', userId],
    queryFn: () => apiClient.getFriendshipStatus(userId),
    enabled: !!userId,
  });

  // Fetch server members to get roles if serverId is provided
  const { data: members = [] } = useServerMembers(serverId);

  const user = response?.data;
  const friendshipData = friendshipResponse?.data;

  // Find the member in the server to get their roles
  const serverMember = serverId ? members.find(m => m.userId === userId) : null;
  const memberRoles = serverMember?.roles || [];

  // Determine friendship status
  const getFriendshipStatus = () => {
    if (!friendshipData) return 'none' as const;
    if (friendshipData.isBlocked) return 'blocked' as const;
    if (friendshipData.isFriend) return 'friends' as const;
    if (friendshipData.hasIncomingRequest) return 'pending-received' as const;
    if (friendshipData.hasOutgoingRequest) return 'pending-sent' as const;
    return 'none' as const;
  };

  if (isLoading) {
    return (
      <Modal open onClose={onClose} size="lg" showCloseButton>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Modal>
    );
  }

  if (error || !user) {
    return (
      <Modal open onClose={onClose} size="lg" showCloseButton>
        <div className="p-8 text-center">
          <p className="text-foreground-muted">User not found</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="lg" showCloseButton noBorder noHeader>
      <div className="relative">
        {/* Close button positioned absolutely - top right */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 rounded-lg p-1.5 text-foreground-muted hover:bg-background-surface hover:text-foreground transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>
        <ProfilePanel
          variant="modal"
          user={{
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            bio: user.bio || undefined,
            avatar: user.avatarUrl || undefined,
            banner: user.bannerUrl || undefined,
            roles: memberRoles,
            joinedAt: serverMember?.joinedAt,
            activities: [],
          }}
          friendshipStatus={getFriendshipStatus()}
          onMessage={() => {
            onClose();
          }}
          onAddFriend={() => {
            // The ProfilePanel handles the UI, we just need to trigger a refetch
            // of friendship status after the action
          }}
        />
      </div>
    </Modal>
  );
}
