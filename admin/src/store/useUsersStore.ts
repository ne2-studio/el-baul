import { create } from 'zustand';
import { AdminUser, AdminUserDetail } from '../types';
import { api } from '../api';

interface UsersStore {
  users: AdminUser[];
  selectedUser: AdminUserDetail | null;
  isLoading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  fetchUser: (id: string) => Promise<void>;
}

export const useUsersStore = create<UsersStore>((set) => ({
  users: [],
  selectedUser: null,
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await api.users.getAll();
      set({ users, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchUser: async (id) => {
    set({ isLoading: true, error: null, selectedUser: null });
    try {
      const selectedUser = await api.users.getById(id);
      set({ selectedUser, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
