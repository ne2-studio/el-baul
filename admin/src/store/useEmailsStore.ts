import { create } from 'zustand';
import { AdminSentEmail } from '../types';
import { api } from '../api';

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
    set({ isLoading: true, error: null });
    try {
      const emails = await api.emails.getAll();
      set({ emails, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
