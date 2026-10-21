'use client';

import dynamic from 'next/dynamic';
import { useUIStore } from '@/stores';

// All modals are code-split: only the opened modal's chunk is fetched.
// Server-settings is the heavy one (permissions, roles, bans, invites).
const CreateServerModal = dynamic(() => import('./create-server-modal').then((m) => m.CreateServerModal));
const JoinServerModal = dynamic(() => import('./join-server-modal').then((m) => m.JoinServerModal));
const AddFriendModal = dynamic(() => import('./add-friend-modal').then((m) => m.AddFriendModal));
const UserProfileModal = dynamic(() => import('./user-profile-modal').then((m) => m.UserProfileModal));
const UserSettingsModal = dynamic(() => import('./user-settings-modal').then((m) => m.UserSettingsModal));
const InvitePeopleModal = dynamic(() => import('./invite-people-modal').then((m) => m.InvitePeopleModal));
const CreateChannelModal = dynamic(() => import('./create-channel-modal').then((m) => m.CreateChannelModal));
const CreateCategoryModal = dynamic(() => import('./create-category-modal').then((m) => m.CreateCategoryModal));
const ServerSettingsModal = dynamic(() => import('./server-settings').then((m) => m.ServerSettingsModal));
const DeleteServerModal = dynamic(() => import('./delete-server-modal').then((m) => m.DeleteServerModal));
const EditChannelModal = dynamic(() => import('./edit-channel-modal').then((m) => m.EditChannelModal));
const DeleteChannelModal = dynamic(() => import('./delete-channel-modal').then((m) => m.DeleteChannelModal));

export function ModalRenderer() {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);

  const renderModal = () => {
    switch (activeModal.type) {
      case 'create-server':
        return <CreateServerModal onClose={closeModal} />;
      case 'join-server':
        return <JoinServerModal onClose={closeModal} />;
      case 'add-friend':
        return <AddFriendModal onClose={closeModal} />;
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
