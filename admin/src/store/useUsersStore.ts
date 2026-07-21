import { create } from 'zustand';
import { AdminSentEmail, AdminUser, AdminUserDetail } from '../types';
import { api } from '../api';

interface UsersStore {
  users: AdminUser[];
  selectedUser: AdminUserDetail | null;
  selectedUserEmails: AdminSentEmail[];
  isLoading: boolean;
  isLoadingEmails: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  fetchUser: (id: string) => Promise<void>;
  fetchUserEmails: (id: string) => Promise<void>;
}

export const useUsersStore = create<UsersStore>((set) => ({
  users: [],
  selectedUser: null,
  selectedUserEmails: [],
  isLoading: false,
  isLoadingEmails: false,
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
    set({ isLoading: true, error: null, selectedUser: null, selectedUserEmails: [] });
    try {
      const selectedUser = await api.users.getById(id);
      set({ selectedUser, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchUserEmails: async (id) => {
    set({ isLoadingEmails: true });
    try {
      const selectedUserEmails = await api.users.getEmails(id);
      set({ selectedUserEmails, isLoadingEmails: false });
    } catch {
      // Non-fatal: the rest of the user detail page still works without this section.
      set({ isLoadingEmails: false });
    }
  },
}));
