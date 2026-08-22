import { create } from 'zustand';
import { AdminSentPushNotification } from '../types';
import { api } from '../api';
import { runFetch } from './asyncFetch';

interface PushNotificationsStore {
  pushNotifications: AdminSentPushNotification[];
  isLoading: boolean;
  error: string | null;

  fetchPushNotifications: () => Promise<void>;
}

export const usePushNotificationsStore = create<PushNotificationsStore>((set) => ({
  pushNotifications: [],
  isLoading: false,
  error: null,

  fetchPushNotifications: async () => {
    await runFetch(set, { loading: 'isLoading', error: 'error' }, async () => ({
      pushNotifications: await api.pushNotifications.getAll(),
    }));
  },
}));
