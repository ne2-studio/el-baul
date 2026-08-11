// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { Chapter, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { ChapterPhotoViewerContainer } from './ChapterPhotoViewerContainer';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/features/memories/useCases', () => ({
  loadRecuerdos: vi.fn().mockResolvedValue(undefined),
  addRecuerdo: vi.fn().mockResolvedValue(undefined),
  editRecuerdo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadTaggedPersonas: vi.fn().mockResolvedValue(undefined),
  setTaggedPersonas: vi.fn().mockResolvedValue(undefined),
  submitRemovalRequest: vi.fn().mockResolvedValue(undefined),
  deletePhoto: vi.fn().mockResolvedValue(undefined),
  changePhotoDate: vi.fn().mockResolvedValue(undefined),
  clearPhotoDate: vi.fn().mockResolvedValue(undefined),
  movePhotos: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api', () => ({
  api: {
    photos: { download: vi.fn(), createShareLink: vi.fn() },
    recuerdos: { createShareLink: vi.fn() },
  },
  isForbiddenError: () => false,
}));

vi.mock('@/utils/downloadFile', () => ({
  saveDownloadedPhoto: vi.fn(),
}));

vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: vi.fn(),
}));

import { movePhotos } from '@/features/photos/useCases';

const photos: Photo[] = [
  { id: 'photo-1', thumbnailUrl: '/photo-1-thumb.jpg', fullUrl: '/photo-1.jpg', recuerdoCount: 0 },
  { id: 'photo-2', thumbnailUrl: '/photo-2-thumb.jpg', fullUrl: '/photo-2.jpg', recuerdoCount: 0 },
];

const chapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2024', photoCount: 3, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: 'c2', name: 'Navidad', photoCount: 1, lastUpdated: 'hace 1 mes', recuerdoCount: 0, undatedPhotoCount: 0 },
];

function renderContainer(overrides: Partial<ComponentProps<typeof ChapterPhotoViewerContainer>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/baules/baul-1/capitulos/c1/foto/photo-2']}>
      <Routes>
        <Route
          path="/baules/:baulId/capitulos/:chapterId/foto/:photoId"
          element={
            <ChapterPhotoViewerContainer
              photo={photos[1]}
              photos={photos}
              baulId="baul-1"
              baulName="Familia García"
              apiChapterId="c1"
              allChapters={chapters}
              currentChapter={chapters[0]}
              onClose={vi.fn()}
              onPhotoChange={vi.fn()}
              {...overrides}
            />
          }
        />
        <Route path="/baules/:baulId/capitulos/:chapterId" element={<div>Vista del capítulo</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Más opciones' }));
}

describe('ChapterPhotoViewerContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePersonasStore.setState({ personas: {}, taggedPersonas: {}, personaPhotos: {}, removalRequests: {} });
    useRecuerdosStore.setState({ recuerdos: {} });
    useAppConfigStore.setState({ sharedLinksEnabled: false });
  });

  it('offers move when inside a real chapter', async () => {
    const user = userEvent.setup();
    renderContainer();
    await openMenu(user);

    expect(screen.getByText('Mover a otro capítulo')).toBeInTheDocument();
  });

  it('still offers move for the virtual "fotos sueltas" chapter', async () => {
    const user = userEvent.setup();
    renderContainer({ apiChapterId: null, currentChapter: undefined });
    await openMenu(user);

    expect(screen.getByText('Mover a otro capítulo')).toBeInTheDocument();
  });

  it('hides move when there is nowhere else to move to', async () => {
    const user = userEvent.setup();
    renderContainer({ allChapters: [chapters[0]] });
    await openMenu(user);

    expect(screen.queryByText('Mover a otro capítulo')).not.toBeInTheDocument();
  });

  it('moves the photo and self-navigates to the target chapter', async () => {
    const user = userEvent.setup();
    vi.mocked(movePhotos).mockResolvedValue(undefined);
    renderContainer();
    await openMenu(user);
    await user.click(screen.getByText('Mover a otro capítulo'));
    await user.click(screen.getByText('Navidad'));
    await user.click(screen.getByRole('button', { name: /mover aquí/i }));

    expect(movePhotos).toHaveBeenCalledWith('baul-1', 'c1', ['photo-2'], 'c2');
    expect(await screen.findByText('Vista del capítulo')).toBeInTheDocument();
  });

  it('keeps destructive actions last even with the chapter extra merged in', async () => {
    const user = userEvent.setup();
    renderContainer({ isAdmin: true });
    await openMenu(user);

    const moveItem = screen.getByText('Mover a otro capítulo');
    const deleteItem = screen.getByText('Retirar foto');
    // DOCUMENT_POSITION_FOLLOWING (4): moveItem comes before deleteItem in the DOM.
    expect(moveItem.compareDocumentPosition(deleteItem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
