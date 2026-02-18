'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useServerStore } from '@/stores/serverStore';
import { useChannelStore } from '@/stores/channelStore';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { openModal, closeModal, activeModal, closeContextMenu } = useUIStore();
  const { servers, currentServerId } = useServerStore();
  const { getChannelsByServer, currentChannelId, setCurrentChannel } = useChannelStore();

  // Handle search modal
  const openSearch = useCallback(() => {
    openModal('search');
  }, [openModal]);

  // Close current modal
  const handleCloseModal = useCallback(() => {
    if (activeModal.type !== 'none') {
      closeModal();
    }
    closeContextMenu();
  }, [activeModal.type, closeModal, closeContextMenu]);

  // Navigate to previous channel
  const navigatePreviousChannel = useCallback(() => {
    if (!currentServerId) return;

    const { channels } = getChannelsByServer(currentServerId);
    const textChannels = channels.filter((c) => c.type === 'text');

    if (textChannels.length === 0 || !currentChannelId) return;

    const currentIndex = textChannels.findIndex((c) => c.id === currentChannelId);
    if (currentIndex > 0) {
      const prevChannel = textChannels[currentIndex - 1];
      setCurrentChannel(prevChannel.id);
      router.push(`/app/servers/${currentServerId}/channels/${prevChannel.id}`);
    }
  }, [currentServerId, currentChannelId, getChannelsByServer, setCurrentChannel, router]);

  // Navigate to next channel
  const navigateNextChannel = useCallback(() => {
    if (!currentServerId) return;

    const { channels } = getChannelsByServer(currentServerId);
    const textChannels = channels.filter((c) => c.type === 'text');

    if (textChannels.length === 0 || !currentChannelId) return;

    const currentIndex = textChannels.findIndex((c) => c.id === currentChannelId);
    if (currentIndex < textChannels.length - 1) {
      const nextChannel = textChannels[currentIndex + 1];
      setCurrentChannel(nextChannel.id);
      router.push(`/app/servers/${currentServerId}/channels/${nextChannel.id}`);
    }
  }, [currentServerId, currentChannelId, getChannelsByServer, setCurrentChannel, router]);

  // Navigate to specific server by index
  const navigateToServer = useCallback((index: number) => {
    if (index < 0 || index >= servers.length) return;

    const server = servers[index];
    if (!server) return;

    const { channels } = getChannelsByServer(server.id);
    const firstTextChannel = channels.find((c) => c.type === 'text');

    if (firstTextChannel) {
      setCurrentChannel(firstTextChannel.id);
      router.push(`/app/servers/${server.id}/channels/${firstTextChannel.id}`);
    } else {
      router.push(`/app/servers/${server.id}`);
    }
  }, [servers, getChannelsByServer, setCurrentChannel, router]);

  // Navigate to DMs
  const navigateToDMs = useCallback(() => {
    router.push('/app');
  }, [router]);

  // Create server shortcut
  const openCreateServer = useCallback(() => {
    openModal('create-server');
  }, [openModal]);

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Search
    { key: 'k', ctrl: true, action: openSearch, description: 'Open search' },
    { key: 'k', meta: true, action: openSearch, description: 'Open search (Mac)' },

    // Close modal / Escape
    { key: 'Escape', action: handleCloseModal, description: 'Close modal or menu' },

    // Channel navigation with Alt + Arrow
    { key: 'ArrowUp', alt: true, action: navigatePreviousChannel, description: 'Previous channel' },
    { key: 'ArrowDown', alt: true, action: navigateNextChannel, description: 'Next channel' },

    // DMs navigation
    { key: '0', ctrl: true, action: navigateToDMs, description: 'Go to DMs' },

    // Server navigation (Ctrl + 1-9)
    ...Array.from({ length: 9 }, (_, i) => ({
      key: String(i + 1),
      ctrl: true,
      action: () => navigateToServer(i),
      description: `Go to server ${i + 1}`,
    })),

    // Create server
    { key: 'n', ctrl: true, shift: true, action: openCreateServer, description: 'Create new server' },
  ];

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape even in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    // Find matching shortcut
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      // For Escape, only check key match
      if (shortcut.key === 'Escape' && keyMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  // Register event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: shortcuts.map((s) => ({
      key: s.key,
      ctrl: s.ctrl,
      shift: s.shift,
      alt: s.alt,
      meta: s.meta,
      description: s.description,
    })),
  };
}

// Helper to format shortcut for display
export function formatShortcut(shortcut: {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}): string {
  const parts: string[] = [];

  if (shortcut.ctrl || shortcut.meta) {
    parts.push('Ctrl');
  }
  if (shortcut.shift) {
    parts.push('Shift');
  }
  if (shortcut.alt) {
    parts.push('Alt');
  }

  // Format key name
  let keyName = shortcut.key;
  if (keyName === 'ArrowUp') keyName = '↑';
  else if (keyName === 'ArrowDown') keyName = '↓';
  else if (keyName === 'ArrowLeft') keyName = '←';
  else if (keyName === 'ArrowRight') keyName = '→';
  else if (keyName === 'Escape') keyName = 'Esc';
  else keyName = keyName.toUpperCase();

  parts.push(keyName);

  return parts.join(' + ');
}
