'use client';

import { Modal } from '@/components/ui';
import { useUIStore } from '@/stores';
import { CreateServerModal } from './create-server-modal';
import { JoinServerModal } from './join-server-modal';
import { UserProfileModal } from './user-profile-modal';

export function ModalRenderer() {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);

  const renderModal = () => {
    switch (activeModal.type) {
      case 'create-server':
        return <CreateServerModal onClose={closeModal} />;
      case 'join-server':
        return <JoinServerModal onClose={closeModal} />;
      case 'user-profile':
        return (
          <UserProfileModal
            userId={activeModal.data.userId as string}
            serverId={activeModal.data.serverId as string}
            onClose={closeModal}
          />
        );
      default:
        return null;
    }
  };

  return <>{renderModal()}</>;
}
