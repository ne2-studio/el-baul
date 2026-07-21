import { create } from 'zustand';
import { AdminBaul, AdminBaulDetail } from '../types';
import { api } from '../api';

interface BaulesStore {
  baules: AdminBaul[];
  selectedBaul: AdminBaulDetail | null;
  isLoading: boolean;
  error: string | null;

  fetchBaules: () => Promise<void>;
  fetchBaul: (id: string) => Promise<void>;
}

export const useBaulesStore = create<BaulesStore>((set) => ({
  baules: [],
  selectedBaul: null,
  isLoading: false,
  error: null,

  fetchBaules: async () => {
    set({ isLoading: true, error: null });
    try {
      const baules = await api.baules.getAll();
      set({ baules, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchBaul: async (id) => {
    set({ isLoading: true, error: null, selectedBaul: null });
    try {
      const selectedBaul = await api.baules.getById(id);
      set({ selectedBaul, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
