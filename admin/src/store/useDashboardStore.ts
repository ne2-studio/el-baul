import { create } from 'zustand';
import { DashboardKpis } from '../types';
import { api } from '../api';

interface DashboardStore {
  kpis: DashboardKpis | null;
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  kpis: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const kpis = await api.dashboard.get();
      set({ kpis, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
