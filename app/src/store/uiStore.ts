import { create } from 'zustand';

interface UIState {
  // Toast state
  showToast: boolean;
  toastMessage: string;
  showToastMessage: (message: string) => void;
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
  showToastMessage: (message: string) => {
    set({ showToast: true, toastMessage: message });
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
