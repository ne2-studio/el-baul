import { create } from 'zustand';
import { Recuerdo } from '@/types';

export interface RecuerdosState {
  recuerdos: Record<string, Recuerdo[]>;
  chapterRecuerdos: Record<string, Recuerdo[]>;
  baulRecuerdos: Record<string, Recuerdo[]>;

  reset: () => void;
}

// Actions live in features/memories/useCases — this store only holds state and its reset.
export const useRecuerdosStore = create<RecuerdosState>((set) => ({
  recuerdos: {},
  chapterRecuerdos: {},
  baulRecuerdos: {},

  reset: () => set({
    recuerdos: {},
    chapterRecuerdos: {},
    baulRecuerdos: {},
  }),
}));
