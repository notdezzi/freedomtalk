import { create } from 'zustand';
import type { ReactNode } from 'react';

export type ModalType =
  | 'create-server'
  | 'join-server'
  | 'server-settings'
  | 'channel-settings'
  | 'user-settings'
  | 'invite-people'
  | 'create-channel'
  | 'edit-channel'
  | 'create-category'
  | 'delete-channel'
  | 'leave-server'
  | 'delete-server'
  | 'user-profile'
  | 'pinned-messages'
  | 'search'
  | null;

interface ModalState {
  type: ModalType;
  data: Record<string, unknown>;
}

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  type: string | null;
  data: Record<string, unknown>;
}

interface UIStore {
  // Modal state
  activeModal: ModalState;
  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Sidebar state
  isMembersSidebarOpen: boolean;
  toggleMembersSidebar: () => void;
  setMembersSidebarOpen: (open: boolean) => void;

  // Context menu state
  contextMenu: ContextMenuState;
  openContextMenu: (x: number, y: number, type: string, data?: Record<string, unknown>) => void;
  closeContextMenu: () => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Mobile
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Modal state
  activeModal: { type: null, data: {} },

  openModal: (type, data = {}) =>
    set({ activeModal: { type, data } }),

  closeModal: () =>
    set({ activeModal: { type: null, data: {} } }),

  // Sidebar state
  isMembersSidebarOpen: true,

  toggleMembersSidebar: () =>
    set((state) => ({ isMembersSidebarOpen: !state.isMembersSidebarOpen })),

  setMembersSidebarOpen: (open) =>
    set({ isMembersSidebarOpen: open }),

  // Context menu state
  contextMenu: { open: false, x: 0, y: 0, type: null, data: {} },

  openContextMenu: (x, y, type, data = {}) =>
    set({ contextMenu: { open: true, x, y, type, data } }),

  closeContextMenu: () =>
    set({ contextMenu: { open: false, x: 0, y: 0, type: null, data: {} } }),

  // Theme
  theme: 'dark',

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  // Mobile
  isMobile: false,

  setIsMobile: (isMobile) =>
    set({ isMobile }),
}));
