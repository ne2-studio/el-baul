import { create } from 'zustand';
import { Recuerdo } from '@/types';
import { api } from '@/api';

export interface RecuerdosState {
  recuerdos: Record<string, Recuerdo[]>;
  chapterRecuerdos: Record<string, Recuerdo[]>;
  baulRecuerdos: Record<string, Recuerdo[]>;

  loadRecuerdos: (photoId: string) => Promise<void>;
  addRecuerdo: (baulId: string, photoId: string, text: string) => Promise<void>;
  loadChapterRecuerdos: (baulId: string, chapterId: string) => Promise<void>;
  addChapterRecuerdo: (baulId: string, chapterId: string, text: string) => Promise<void>;
  loadBaulRecuerdos: (baulId: string) => Promise<void>;
  addBaulRecuerdo: (baulId: string, text: string) => Promise<void>;
  // Used by useBaulesStore.deleteChapter — an explicit cross-store call rather than this
  // store implicitly reacting to a chapter being deleted elsewhere.
  clearChapterRecuerdos: (chapterId: string) => void;
  reset: () => void;
}

export const useRecuerdosStore = create<RecuerdosState>((set) => ({
  recuerdos: {},
  chapterRecuerdos: {},
  baulRecuerdos: {},

  loadRecuerdos: async (photoId) => {
    const recuerdos = await api.recuerdos.getAll(photoId);
    set((state) => ({ recuerdos: { ...state.recuerdos, [photoId]: recuerdos } }));
  },

  addRecuerdo: async (baulId, photoId, text) => {
    const recuerdo = await api.recuerdos.create(photoId, text);
    set((state) => ({
      recuerdos: { ...state.recuerdos, [photoId]: [...(state.recuerdos[photoId] || []), recuerdo] },
      // Keeps the baúl-wide "Recuerdos" tab in sync — otherwise it stays stale until
      // BaulRoute is remounted, since its own load is guarded by "already have a cached
      // value for this baulId" (see BaulRoute.tsx). Only patches it when already loaded:
      // creating a one-item stub here would make that guard think it's fully loaded.
      baulRecuerdos: state.baulRecuerdos[baulId]
        ? { ...state.baulRecuerdos, [baulId]: [recuerdo, ...state.baulRecuerdos[baulId]] }
        : state.baulRecuerdos,
    }));
  },

  loadChapterRecuerdos: async (baulId, chapterId) => {
    const recuerdos = await api.recuerdos.getAllByChapter(baulId, chapterId);
    set((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: recuerdos } }));
  },

  addChapterRecuerdo: async (baulId, chapterId, text) => {
    const recuerdo = await api.recuerdos.createForChapter(baulId, chapterId, text);
    set((state) => ({
      chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: [recuerdo, ...(state.chapterRecuerdos[chapterId] || [])] },
      // Same reasoning as addRecuerdo above — keep the baúl-wide tab's cache in sync too.
      baulRecuerdos: state.baulRecuerdos[baulId]
        ? { ...state.baulRecuerdos, [baulId]: [recuerdo, ...state.baulRecuerdos[baulId]] }
        : state.baulRecuerdos,
    }));
  },

  loadBaulRecuerdos: async (baulId) => {
    const recuerdos = await api.recuerdos.getAllByBaul(baulId);
    set((state) => ({ baulRecuerdos: { ...state.baulRecuerdos, [baulId]: recuerdos } }));
  },

  addBaulRecuerdo: async (baulId, text) => {
    const recuerdo = await api.recuerdos.createStandalone(baulId, text);
    set((state) => ({
      baulRecuerdos: { ...state.baulRecuerdos, [baulId]: [recuerdo, ...(state.baulRecuerdos[baulId] || [])] },
    }));
  },

  clearChapterRecuerdos: (chapterId) => set((state) => {
    const { [chapterId]: _removed, ...rest } = state.chapterRecuerdos;
    return { chapterRecuerdos: rest };
  }),

  reset: () => set({
    recuerdos: {},
    chapterRecuerdos: {},
    baulRecuerdos: {},
  }),
}));
