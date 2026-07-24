import { create } from 'zustand';
import { AdminBaul, AdminBaulDetail } from '../types';
import { api } from '../api';
import { runFetch } from './asyncFetch';

interface BaulesStore {
  baules: AdminBaul[];
  selectedBaul: AdminBaulDetail | null;
  isLoading: boolean;
  error: string | null;

  fetchBaules: () => Promise<void>;
  fetchBaul: (id: string) => Promise<void>;
  deleteBaul: (id: string) => Promise<void>;
}

export const useBaulesStore = create<BaulesStore>((set) => ({
  baules: [],
  selectedBaul: null,
  isLoading: false,
  error: null,

  fetchBaules: async () => {
    await runFetch(set, { loading: 'isLoading', error: 'error' }, async () => ({
      baules: await api.baules.getAll(),
    }));
  },

  fetchBaul: async (id) => {
    await runFetch(
      set,
      { loading: 'isLoading', error: 'error' },
      async () => ({ selectedBaul: await api.baules.getById(id) }),
      { selectedBaul: null },
    );
  },

  deleteBaul: async (id) => {
    await api.baules.delete(id);
    set({ selectedBaul: null });
  },
}));
