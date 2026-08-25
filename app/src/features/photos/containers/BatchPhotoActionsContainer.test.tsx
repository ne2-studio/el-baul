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
  deletePhotosBatch: vi.fn(),
}));

vi.mock('@/features/chapters/useCases', () => ({
  addTaggedPersonasBatch: vi.fn(),
  changePhotoDateBatch: vi.fn(),
  clearPhotoDateBatch: vi.fn(),
  createChapter: vi.fn(),
}));

import { deletePhotosBatch, movePhotos } from '@/features/photos/useCases';
import { addTaggedPersonasBatch, clearPhotoDateBatch, createChapter } from '@/features/chapters/useCases';

const baulId = 'baul-1';
const photos = [{ id: 'photo-1', thumbnailUrl: 't1', date: { year: 2020 }, canDelete: true }] as Photo[];
const persona = { id: 'p1', baulId, nickname: 'Abuela Rosa' } as Persona;
const chapters = [{ id: 'c2', name: 'Navidad' }] as Chapter[];

function renderContainer(
  chapterId: string | null,
  options: { photos?: Photo[]; selectedIds?: Set<string>; onDone?: () => void } = {}
) {
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
              photos={options.photos ?? photos}
              selectedIds={options.selectedIds ?? new Set(['photo-1'])}
              moveableChapters={chapters}
              onDone={options.onDone ?? vi.fn()}
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

  it('clears the date of the selected photos', async () => {
    const user = userEvent.setup();
    vi.mocked(clearPhotoDateBatch).mockResolvedValue(undefined);

    renderContainer('chapter-1');
    await user.click(screen.getByRole('button', { name: /borrar fecha/i }));
    await user.click(screen.getByRole('button', { name: /sí, borrar fecha/i }));

    expect(clearPhotoDateBatch).toHaveBeenCalledWith(baulId, ['photo-1']);
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

  it('creates a chapter from the text typed in the move modal, moves the selection into it, and navigates there', async () => {
    const user = userEvent.setup();
    vi.mocked(createChapter).mockResolvedValue({ id: 'new-chapter' } as Chapter);
    vi.mocked(movePhotos).mockResolvedValue(undefined);

    renderContainer('chapter-1');
    await user.click(screen.getByRole('button', { name: /^mover$/i }));
    await user.type(screen.getByLabelText('Buscar capítulo'), 'Verano');
    await user.click(screen.getByText('Nuevo capítulo "Verano"'));
    await user.click(screen.getByRole('button', { name: /mover aquí/i }));

    expect(createChapter).toHaveBeenCalledWith(baulId, 'Verano');
    await waitFor(() => expect(movePhotos).toHaveBeenCalledWith(baulId, 'chapter-1', ['photo-1'], 'new-chapter', expect.any(Function)));
    await waitFor(() => expect(screen.getByText('Vista de capítulo')).toBeInTheDocument());
  });

  it('deletes the deletable photos in the selection with a single shared reason', async () => {
    const user = userEvent.setup();
    vi.mocked(deletePhotosBatch).mockResolvedValue(undefined);
    const onDone = vi.fn();

    renderContainer('chapter-1', { onDone });
    await user.click(screen.getByRole('button', { name: /borrar 1 foto/i }));
    expect(screen.getByText(/se borrarán 1 foto/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/por qué se borran estas fotos/i), 'duplicadas');
    await user.click(screen.getByRole('button', { name: /sí, borrar fotos/i }));

    await waitFor(() => expect(deletePhotosBatch).toHaveBeenCalledWith(baulId, ['photo-1'], 'duplicadas'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('only deletes the eligible subset when the selection mixes deletable and non-deletable photos', async () => {
    const user = userEvent.setup();
    vi.mocked(deletePhotosBatch).mockResolvedValue(undefined);
    const mixedPhotos = [
      { id: 'photo-1', thumbnailUrl: 't1', date: { year: 2020 }, canDelete: true },
      { id: 'photo-2', thumbnailUrl: 't2', date: { year: 2019 }, canDelete: false },
    ] as Photo[];

    renderContainer('chapter-1', { photos: mixedPhotos, selectedIds: new Set(['photo-1', 'photo-2']) });
    await user.click(screen.getByRole('button', { name: /borrar 1 foto/i }));
    expect(screen.getByText(/se borrarán 1 foto/i)).toBeInTheDocument();
    expect(screen.getByText(/solo se pueden borrar 1 de las 2 fotos seleccionadas/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/por qué se borran estas fotos/i), 'duplicadas');
    await user.click(screen.getByRole('button', { name: /sí, borrar fotos/i }));

    await waitFor(() => expect(deletePhotosBatch).toHaveBeenCalledWith(baulId, ['photo-1'], 'duplicadas'));
  });

  it('disables "Borrar fotos" rather than hiding it when none of the selection is deletable', () => {
    const undeletablePhotos = [{ id: 'photo-1', thumbnailUrl: 't1', date: { year: 2020 }, canDelete: false }] as Photo[];

    renderContainer('chapter-1', { photos: undeletablePhotos });

    expect(screen.getByRole('button', { name: /borrar fotos/i })).toBeDisabled();
  });
});
