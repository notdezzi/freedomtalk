import { create } from 'zustand';
import type { Channel } from './channelStore';

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
  | 'none';

export interface CreateChannelData {
  serverId: string;
  categoryId?: string;
}

export interface EditChannelData {
  channel: Channel;
}

export interface CreateCategoryData {
  serverId: string;
}

interface ModalState {
  type: ModalType;
  data?: Record<string, unknown>;
  createChannelData?: CreateChannelData;
  editChannelData?: EditChannelData;
  createCategoryData?: CreateCategoryData;
}

interface UIState {
  // Modals
  activeModal: ModalState;
  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  openCreateChannelModal: (data: CreateChannelData) => void;
  openEditChannelModal: (data: EditChannelData) => void;
  openCreateCategoryModal: (data: CreateCategoryData) => void;
  closeModal: () => void;

  // Sidebars
  isServerSidebarOpen: boolean;
  isChannelSidebarOpen: boolean;
  isMemberSidebarOpen: boolean;
  toggleServerSidebar: () => void;
  toggleChannelSidebar: () => void;
  toggleMemberSidebar: () => void;
  setServerSidebarOpen: (open: boolean) => void;
  setChannelSidebarOpen: (open: boolean) => void;
  setMemberSidebarOpen: (open: boolean) => void;

  // Mobile
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;

  // Context menus
  contextMenu: { x: number; y: number; type: string; data?: Record<string, unknown> } | null;
  openContextMenu: (x: number, y: number, type: string, data?: Record<string, unknown>) => void;
  closeContextMenu: () => void;

  // Tooltips
  tooltipPosition: { x: number; y: number } | null;
  tooltipContent: string | null;
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Modals
  activeModal: { type: 'none' },
  openModal: (type, data) => set({ activeModal: { type, data } }),
  openCreateChannelModal: (createChannelData) =>
    set({ activeModal: { type: 'create-channel', createChannelData } }),
  openEditChannelModal: (editChannelData) =>
    set({ activeModal: { type: 'edit-channel', editChannelData } }),
  openCreateCategoryModal: (createCategoryData) =>
    set({ activeModal: { type: 'create-category', createCategoryData } }),
  closeModal: () => set({ activeModal: { type: 'none' } }),

  // Sidebars
  isServerSidebarOpen: true,
  isChannelSidebarOpen: true,
  isMemberSidebarOpen: true,
  toggleServerSidebar: () => set((state) => ({ isServerSidebarOpen: !state.isServerSidebarOpen })),
  toggleChannelSidebar: () => set((state) => ({ isChannelSidebarOpen: !state.isChannelSidebarOpen })),
  toggleMemberSidebar: () => set((state) => ({ isMemberSidebarOpen: !state.isMemberSidebarOpen })),
  setServerSidebarOpen: (isServerSidebarOpen) => set({ isServerSidebarOpen }),
  setChannelSidebarOpen: (isChannelSidebarOpen) => set({ isChannelSidebarOpen }),
  setMemberSidebarOpen: (isMemberSidebarOpen) => set({ isMemberSidebarOpen }),

  // Mobile
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),

  // Context menus
  contextMenu: null,
  openContextMenu: (x, y, type, data) => set({ contextMenu: { x, y, type, data } }),
  closeContextMenu: () => set({ contextMenu: null }),

  // Tooltips
  tooltipPosition: null,
  tooltipContent: null,
  showTooltip: (x, y, content) => set({ tooltipPosition: { x, y }, tooltipContent: content }),
  hideTooltip: () => set({ tooltipPosition: null, tooltipContent: null }),

  // Theme
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
}));
