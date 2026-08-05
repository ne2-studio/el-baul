// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chapter, Persona, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { BatchPhotoActionsContainer } from './BatchPhotoActionsContainer';

vi.mock('@/features/photos/useCases', () => ({
  movePhotos: vi.fn(),
}));

vi.mock('@/features/chapters/useCases', () => ({
  addTaggedPersonasBatch: vi.fn(),
  changePhotoDateBatch: vi.fn(),
  createChapter: vi.fn(),
}));

import { movePhotos } from '@/features/photos/useCases';
import { addTaggedPersonasBatch, createChapter } from '@/features/chapters/useCases';

const baulId = 'baul-1';
const photos = [{ id: 'photo-1', thumbnailUrl: 't1' }] as Photo[];
const persona = { id: 'p1', baulId, nickname: 'Abuela Rosa' } as Persona;
const chapters = [{ id: 'c2', name: 'Navidad' }] as Chapter[];

function renderContainer(chapterId: string | null) {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}`]}>
      <Routes>
        <Route
          path="/baules/:baulId"
          element={
            <BatchPhotoActionsContainer
              active
              baulId={baulId}
              chapterId={chapterId}
              photos={photos}
              selectedIds={new Set(['photo-1'])}
              moveableChapters={chapters}
              onDone={vi.fn()}
            />
          }
        />
        <Route path="/baules/:baulId/capitulos/:chapterId" element={<div>Vista de capítulo</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BatchPhotoActionsContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: { [baulId]: [persona] }, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('offers "crear nuevo capítulo" only for the fotos sueltas virtual chapter', () => {
    renderContainer(null);
    expect(screen.getByRole('button', { name: /crear nuevo capítulo/i })).toBeInTheDocument();
  });

  it('hides "crear nuevo capítulo" for a real chapter', () => {
    renderContainer('chapter-1');
    expect(screen.queryByRole('button', { name: /crear nuevo capítulo/i })).not.toBeInTheDocument();
  });

  it('tags the selected photos with the chosen personas', async () => {
    const user = userEvent.setup();
    vi.mocked(addTaggedPersonasBatch).mockResolvedValue(undefined);

    renderContainer('chapter-1');
    await user.click(screen.getByRole('button', { name: /etiquetar personas/i }));
    await user.click(screen.getByText('Abuela Rosa'));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(addTaggedPersonasBatch).toHaveBeenCalledWith(baulId, ['photo-1'], ['p1']);
  });

  it('creates a chapter from the selection, moves the photos into it, and navigates there', async () => {
    const user = userEvent.setup();
    vi.mocked(createChapter).mockResolvedValue({ id: 'new-chapter' } as Chapter);
    vi.mocked(movePhotos).mockResolvedValue(undefined);

    renderContainer(null);
    await user.click(screen.getByRole('button', { name: /crear nuevo capítulo/i }));
    await user.type(screen.getByPlaceholderText(/nombre del capítulo/i), 'Verano');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    expect(createChapter).toHaveBeenCalledWith(baulId, 'Verano');
    await waitFor(() => expect(movePhotos).toHaveBeenCalledWith(baulId, null, ['photo-1'], 'new-chapter'));
    await waitFor(() => expect(screen.getByText('Vista de capítulo')).toBeInTheDocument());
  });
});
