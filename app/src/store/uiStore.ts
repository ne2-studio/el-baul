import { create } from 'zustand';
import type { ToastVariant } from '@/design-system/components/feedback/Toast';

interface UIState {
  // Toast state
  showToast: boolean;
  toastMessage: string;
  toastVariant: ToastVariant;
  showToastMessage: (message: string, variant?: ToastVariant) => void;
  hideToast: () => void;

  // Modals state
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  showPlanLimitModal: boolean;
  setShowPlanLimitModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Toast
  showToast: false,
  toastMessage: '',
  toastVariant: 'success',
  showToastMessage: (message: string, variant: ToastVariant = 'success') => {
    set({ showToast: true, toastMessage: message, toastVariant: variant });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      set({ showToast: false });
    }, 3000);
  },
  hideToast: () => set({ showToast: false }),

  // Modals
  showProfileMenu: false,
  setShowProfileMenu: (show) => set({ showProfileMenu: show }),
  showPlanLimitModal: false,
  setShowPlanLimitModal: (show) => set({ showPlanLimitModal: show }),
}));
