'use client';

import { useUIStore } from '@/stores/uiStore';
import UserProfileCard from '@/components/user/UserProfileCard';

export default function UserProfileModal() {
  const { activeModal, closeModal } = useUIStore();

  const isOpen = activeModal.type === 'user-profile';
  const userId = activeModal.data?.userId as string | undefined;
  const serverId = activeModal.data?.serverId as string | undefined;

  if (!isOpen || !userId) return null;

  return (
    <UserProfileCard
      userId={userId}
      serverId={serverId}
      onClose={closeModal}
    />
  );
}
