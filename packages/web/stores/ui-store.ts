import { create } from 'zustand';

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
  | 'add-friend'
  | null;

interface ModalState {
  type: ModalType;
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

  // Mobile
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

// Note: the app is intentionally dark-only. The old `theme`/`toggleTheme`
// pair was removed (it never affected any class wiring); re-introduce with a
// designed light palette if a light theme is ever built.
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

  // Mobile
  isMobileNavOpen: false,

  setMobileNavOpen: (open) =>
    set({ isMobileNavOpen: open }),
}));
