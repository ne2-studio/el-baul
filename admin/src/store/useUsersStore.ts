import { create } from 'zustand';
import { AdminSentEmail, AdminSentPushNotification, AdminUser, AdminUserDetail } from '../types';
import { api } from '../api';
import { runFetch } from './asyncFetch';

interface UsersStore {
  users: AdminUser[];
  selectedUser: AdminUserDetail | null;
  selectedUserEmails: AdminSentEmail[];
  selectedUserPushNotifications: AdminSentPushNotification[];
  isLoading: boolean;
  isLoadingEmails: boolean;
  isLoadingPushNotifications: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  fetchUser: (id: string) => Promise<void>;
  fetchUserEmails: (id: string) => Promise<void>;
  fetchUserPushNotifications: (id: string) => Promise<void>;
}

export const useUsersStore = create<UsersStore>((set) => ({
  users: [],
  selectedUser: null,
  selectedUserEmails: [],
  selectedUserPushNotifications: [],
  isLoading: false,
  isLoadingEmails: false,
  isLoadingPushNotifications: false,
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
      { selectedUser: null, selectedUserEmails: [], selectedUserPushNotifications: [] },
    );
  },

  fetchUserEmails: async (id) => {
    // Non-fatal: the rest of the user detail page still works without this section, so no error key.
    await runFetch(set, { loading: 'isLoadingEmails' }, async () => ({
      selectedUserEmails: await api.users.getEmails(id),
    }));
  },

  fetchUserPushNotifications: async (id) => {
    // Non-fatal, same rationale as fetchUserEmails.
    await runFetch(set, { loading: 'isLoadingPushNotifications' }, async () => ({
      selectedUserPushNotifications: await api.users.getPushNotifications(id),
    }));
  },
}));
