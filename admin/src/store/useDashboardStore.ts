import { create } from 'zustand';
import { DashboardKpis } from '../types';
import { api } from '../api';
import { runFetch } from './asyncFetch';

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
    await runFetch(set, { loading: 'isLoading', error: 'error' }, async () => ({
      kpis: await api.dashboard.get(),
    }));
  },
}));
