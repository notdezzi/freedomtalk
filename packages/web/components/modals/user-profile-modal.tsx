'use client';

import { Modal } from '@/components/ui';
import { ProfilePanel } from '@/components/user';
import type { User } from '@/types';

interface UserProfileModalProps {
  userId: string;
  serverId?: string;
  onClose: () => void;
}

export function UserProfileModal({ userId, serverId, onClose }: UserProfileModalProps) {
  // TODO: Fetch user data from API
  const user: User = {
    id: userId,
    username: 'Unknown User',
    displayName: 'Unknown User',
    bio: 'This is a sample bio.',
    status: 'online',
  };

  return (
    <Modal open onClose={onClose} size="lg" showCloseButton>
      <div className="p-0">
        <ProfilePanel
          variant="modal"
          user={{
            ...user,
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
