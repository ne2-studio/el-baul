import { create } from 'zustand';
import { AdminSentEmail } from '../types';
import { api } from '../api';
import { runFetch } from './asyncFetch';

interface EmailsStore {
  emails: AdminSentEmail[];
  isLoading: boolean;
  error: string | null;

  fetchEmails: () => Promise<void>;
}

export const useEmailsStore = create<EmailsStore>((set) => ({
  emails: [],
  isLoading: false,
  error: null,

  fetchEmails: async () => {
    await runFetch(set, { loading: 'isLoading', error: 'error' }, async () => ({
      emails: await api.emails.getAll(),
    }));
  },
}));
