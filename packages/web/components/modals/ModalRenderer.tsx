'use client';

import dynamic from 'next/dynamic';

// Dynamic imports for modals to avoid SSR issues
const CreateServerModal = dynamic(() => import('./CreateServerModal'), { ssr: false });
const JoinServerModal = dynamic(() => import('./JoinServerModal'), { ssr: false });
const CreateChannelModal = dynamic(() => import('./CreateChannelModal'), { ssr: false });
const EditChannelModal = dynamic(() => import('./EditChannelModal'), { ssr: false });
const CreateCategoryModal = dynamic(() => import('./CreateCategoryModal'), { ssr: false });
const ServerSettingsModal = dynamic(() => import('./ServerSettingsModal'), { ssr: false });
const UserSettingsModal = dynamic(() => import('@/components/user/UserSettingsModal'), { ssr: false });

export default function ModalRenderer() {
  return (
    <>
      <CreateServerModal />
      <JoinServerModal />
      <CreateChannelModal />
      <EditChannelModal />
      <CreateCategoryModal />
      <ServerSettingsModal />
      <UserSettingsModal />
    </>
  );
}
