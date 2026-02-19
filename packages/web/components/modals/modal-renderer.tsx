'use client';

import { useUIStore } from '@/stores';
import { CreateServerModal } from './create-server-modal';
import { JoinServerModal } from './join-server-modal';
import { UserProfileModal } from './user-profile-modal';
import { UserSettingsModal } from './user-settings-modal';
import { InvitePeopleModal } from './invite-people-modal';
import { CreateChannelModal } from './create-channel-modal';
import { CreateCategoryModal } from './create-category-modal';
import { ServerSettingsModal } from './server-settings';
import { DeleteServerModal } from './delete-server-modal';
import { EditChannelModal } from './edit-channel-modal';
import { DeleteChannelModal } from './delete-channel-modal';

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
      case 'user-settings':
        return <UserSettingsModal onClose={closeModal} />;
      case 'invite-people':
        return (
          <InvitePeopleModal
            serverId={activeModal.data.serverId as string}
            onClose={closeModal}
          />
        );
      case 'create-channel':
        return (
          <CreateChannelModal
            serverId={activeModal.data.serverId as string}
            onClose={closeModal}
          />
        );
      case 'create-category':
        return (
          <CreateCategoryModal
            serverId={activeModal.data.serverId as string}
            onClose={closeModal}
          />
        );
      case 'server-settings':
        return (
          <ServerSettingsModal
            serverId={activeModal.data.serverId as string}
            onClose={closeModal}
          />
        );
      case 'delete-server':
        return (
          <DeleteServerModal
            serverId={activeModal.data.serverId as string}
            onClose={closeModal}
          />
        );
      case 'edit-channel':
        return (
          <EditChannelModal
            serverId={activeModal.data.serverId as string}
            channelId={activeModal.data.channelId as string}
            onClose={closeModal}
          />
        );
      case 'delete-channel':
        return (
          <DeleteChannelModal
            serverId={activeModal.data.serverId as string}
            channelId={activeModal.data.channelId as string}
            onClose={closeModal}
          />
        );
      default:
        return null;
    }
  };

  return <>{renderModal()}</>;
}
