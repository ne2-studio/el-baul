import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Recuerdo } from '@/types';

vi.mock('@/api', () => ({
  api: {
    recuerdos: {
      create: vi.fn(),
      createForChapter: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { useRecuerdosStore } from './useRecuerdosStore';

// Regression coverage for a bug where adding a recuerdo from a photo or a chapter never
// showed up in the baúl-wide "Recuerdos" tab until the baúl page was reloaded: addRecuerdo
// and addChapterRecuerdo only ever patched their own narrow cache (recuerdos[photoId] /
// chapterRecuerdos[chapterId]), never baulRecuerdos[baulId] — the tab's own load is skipped
// once that cache has *any* value, so it never noticed the addition happened elsewhere.
describe('useRecuerdosStore recuerdo caches stay in sync', () => {
  const baulId = 'baul-1';
  const photoId = 'photo-1';
  const chapterId = 'chapter-1';

  beforeEach(() => {
    useRecuerdosStore.setState({ recuerdos: {}, chapterRecuerdos: {}, baulRecuerdos: {} });
    vi.clearAllMocks();
  });

  function newRecuerdo(id: string, overrides: Partial<Recuerdo> = {}): Recuerdo {
    return new Recuerdo({
      id,
      text: 'hola',
      userName: 'Pedro',
      createdAt: new Date().toISOString(),
      ...overrides,
    });
  }

  it('addRecuerdo patches baulRecuerdos when the baúl-level tab was already loaded', async () => {
    const existing = newRecuerdo('existing');
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [existing] } });

    const created = newRecuerdo('new', { photoId });
    vi.mocked(api.recuerdos.create).mockResolvedValue(created);

    await useRecuerdosStore.getState().addRecuerdo(baulId, photoId, 'hola');

    expect(useRecuerdosStore.getState().recuerdos[photoId]).toEqual([created]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toEqual([created, existing]);
  });

  it('addRecuerdo does not fabricate a partial baulRecuerdos entry when the tab was never loaded', async () => {
    const created = newRecuerdo('new', { photoId });
    vi.mocked(api.recuerdos.create).mockResolvedValue(created);

    await useRecuerdosStore.getState().addRecuerdo(baulId, photoId, 'hola');

    expect(useRecuerdosStore.getState().recuerdos[photoId]).toEqual([created]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toBeUndefined();
  });

  it('addChapterRecuerdo patches baulRecuerdos when the baúl-level tab was already loaded', async () => {
    const existing = newRecuerdo('existing');
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [existing] } });

    const created = newRecuerdo('new', { chapterId });
    vi.mocked(api.recuerdos.createForChapter).mockResolvedValue(created);

    await useRecuerdosStore.getState().addChapterRecuerdo(baulId, chapterId, 'hola');

    expect(useRecuerdosStore.getState().chapterRecuerdos[chapterId]).toEqual([created]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toEqual([created, existing]);
  });

  it('addChapterRecuerdo does not fabricate a partial baulRecuerdos entry when the tab was never loaded', async () => {
    const created = newRecuerdo('new', { chapterId });
    vi.mocked(api.recuerdos.createForChapter).mockResolvedValue(created);

    await useRecuerdosStore.getState().addChapterRecuerdo(baulId, chapterId, 'hola');

    expect(useRecuerdosStore.getState().chapterRecuerdos[chapterId]).toEqual([created]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toBeUndefined();
  });
});
