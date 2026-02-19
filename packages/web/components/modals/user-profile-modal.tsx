'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { ProfilePanel } from '@/components/user';
import { apiClient } from '@/lib/api-client';

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

  const user = response?.data;

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
        {/* Close button positioned absolutely */}
        <button
          onClick={onClose}
          className="absolute top-2 left-2 z-10 rounded-lg p-1.5 text-foreground-muted hover:bg-background-surface hover:text-foreground transition-colors"
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
            roles: [],
            activities: [],
          }}
          friendshipStatus="none"
          onMessage={() => {
            onClose();
          }}
          onAddFriend={() => {}}
        />
      </div>
    </Modal>
  );
}
