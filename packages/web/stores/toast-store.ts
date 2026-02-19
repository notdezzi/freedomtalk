import { create } from 'zustand';
import { generateId } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Helper function to show toasts
export const toast = {
  success: (message: string, duration = 5000) =>
    useToastStore.getState().addToast({ type: 'success', message, duration }),

  error: (message: string, duration = 5000) =>
    useToastStore.getState().addToast({ type: 'error', message, duration }),

  warning: (message: string, duration = 5000) =>
    useToastStore.getState().addToast({ type: 'warning', message, duration }),

  info: (message: string, duration = 5000) =>
    useToastStore.getState().addToast({ type: 'info', message, duration }),
};
