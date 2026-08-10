// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Chapter, Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { PhotoBatchViewerRoute } from './PhotoBatchViewerRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/features/people/useCases', () => ({
  loadPersonas: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadPhotoBatchPhotos: vi.fn().mockResolvedValue(undefined),
  loadTaggedPersonas: vi.fn().mockResolvedValue(undefined),
  setTaggedPersonas: vi.fn().mockResolvedValue(undefined),
  submitRemovalRequest: vi.fn().mockResolvedValue(undefined),
  deletePhoto: vi.fn().mockResolvedValue(undefined),
  changePhotoDate: vi.fn().mockResolvedValue(undefined),
  movePhotos: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/baules/useCases', () => ({
  loadChapters: vi.fn().mockResolvedValue(undefined),
  setBaulCover: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/chapters/useCases', () => ({
  setChapterCover: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api', () => ({
  api: {
    photos: { download: vi.fn(), createShareLink: vi.fn() },
    recuerdos: { createShareLink: vi.fn() },
  },
  isForbiddenError: () => false,
  isUnauthorizedError: () => false,
}));

vi.mock('@/utils/downloadFile', () => ({
  saveDownloadedPhoto: vi.fn(),
}));

vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: vi.fn(),
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 2, role: 'administrador' } as Baul;

const chapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2024', photoCount: 3, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: 'c2', name: 'Navidad', photoCount: 1, lastUpdated: 'hace 1 mes', recuerdoCount: 0, undatedPhotoCount: 0 },
];

// A batch photo carries its chapterId just like any other photo (see PhotoDto) — the batch
// itself belongs to chapter c1.
const batchPhoto = new Photo({
  id: 'photo-1', chapterId: 'c1', baulId: 'baul-1', thumbnailUrl: '/photo-1-thumb.jpg', fullUrl: '/photo-1.jpg',
  uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0,
});

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/baules/baul-1/subida/batch-1/foto/photo-1']}>
      <Routes>
        <Route path="/baules/:baulId/subida/:batchId/foto/:photoId" element={<PhotoBatchViewerRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Más opciones' }));
}

describe('PhotoBatchViewerRoute', () => {
  beforeEach(() => {
    useBaulesStore.setState({
      baules: [baul],
      chapters: { 'baul-1': chapters },
      loosePhotos: { 'baul-1': [] },
      photoBatchPhotos: { 'batch-1': [batchPhoto.id] },
    });
    usePhotosStore.setState({ photosById: { [batchPhoto.id]: batchPhoto } });
    usePersonasStore.setState({ personas: { 'baul-1': [] }, taggedPersonas: {}, personaPhotos: {}, removalRequests: {} });
    useRecuerdosStore.setState({ baulRecuerdos: { 'baul-1': [] }, recuerdos: {} });
  });

  // Regression for: opening a photo from a photo-upload-batch card on the feed ("la galería")
  // never offered "Mover a otro capítulo", even when the batch's photos do belong to a
  // chapter — see PhotoBatchViewerRoute's comment for why (it used to assume a batch never
  // has one).
  it('offers "Mover a otro capítulo" for a batch photo that belongs to a chapter', async () => {
    const user = userEvent.setup();
    renderRoute();
    await openMenu(user);

    expect(screen.getByText('Mover a otro capítulo')).toBeInTheDocument();
    expect(screen.getByText('Establecer como portada del capítulo')).toBeInTheDocument();
  });

  it('still offers "Mover a otro capítulo" (but not chapter-cover) for a batch photo with no chapter', async () => {
    const looseBatchPhoto = new Photo({
      id: 'photo-2', chapterId: null, baulId: 'baul-1', thumbnailUrl: '/photo-2-thumb.jpg', fullUrl: '/photo-2.jpg',
      uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0,
    });
    useBaulesStore.setState({ photoBatchPhotos: { 'batch-1': [looseBatchPhoto.id] } });
    usePhotosStore.setState({ photosById: { [looseBatchPhoto.id]: looseBatchPhoto } });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/baules/baul-1/subida/batch-1/foto/photo-2']}>
        <Routes>
          <Route path="/baules/:baulId/subida/:batchId/foto/:photoId" element={<PhotoBatchViewerRoute />} />
        </Routes>
      </MemoryRouter>
    );
    await openMenu(user);

    expect(screen.getByText('Mover a otro capítulo')).toBeInTheDocument();
    expect(screen.queryByText('Establecer como portada del capítulo')).not.toBeInTheDocument();
  });
});
