'use client';

import { useUIStore } from '@/stores/uiStore';
import { ServerSettingsModal as ServerSettingsModalComponent } from '@/components/server';

export default function ServerSettingsModal() {
  const { activeModal, closeModal } = useUIStore();
  const isOpen = activeModal.type === 'server-settings';
  const serverId = activeModal.data?.serverId as string | undefined;
  const initialTab = activeModal.data?.tab as string | undefined;

  if (!isOpen || !serverId) return null;

  return <ServerSettingsModalComponent serverId={serverId} initialTab={initialTab} onClose={closeModal} />;
}
