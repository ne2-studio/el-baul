import { create } from 'zustand';
import { AdminSentEmail, AdminUser, AdminUserDetail } from '../types';
import { api } from '../api';
import { runFetch } from './asyncFetch';

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
    await runFetch(set, { loading: 'isLoading', error: 'error' }, async () => ({
      users: await api.users.getAll(),
    }));
  },

  fetchUser: async (id) => {
    await runFetch(
      set,
      { loading: 'isLoading', error: 'error' },
      async () => ({ selectedUser: await api.users.getById(id) }),
      { selectedUser: null, selectedUserEmails: [] },
    );
  },

  fetchUserEmails: async (id) => {
    // Non-fatal: the rest of the user detail page still works without this section, so no error key.
    await runFetch(set, { loading: 'isLoadingEmails' }, async () => ({
      selectedUserEmails: await api.users.getEmails(id),
    }));
  },
}));
