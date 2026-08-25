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
import { BaulPhotoViewerRoute } from './BaulPhotoViewerRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadTaggedPersonas: vi.fn().mockResolvedValue(undefined),
  setTaggedPersonas: vi.fn().mockResolvedValue(undefined),
  submitRemovalRequest: vi.fn().mockResolvedValue(undefined),
  deletePhoto: vi.fn().mockResolvedValue(undefined),
  changePhotoDate: vi.fn().mockResolvedValue(undefined),
  clearPhotoDate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/memories/useCases', () => ({
  loadRecuerdos: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api', () => ({
  api: {
    photos: { download: vi.fn(), createShareLink: vi.fn() },
    recuerdos: { getAll: vi.fn().mockResolvedValue([]), createShareLink: vi.fn() },
    baules: { getScope: vi.fn() },
  },
  isForbiddenError: () => false,
  isUnauthorizedError: () => false,
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 2, role: 'administrador' } as Baul;

const chapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2024', photoCount: 3, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 },
];

const chapterPhoto = new Photo({
  id: 'photo-1', chapterId: 'c1', baulId: 'baul-1', thumbnailUrl: '/photo-1-thumb.jpg', fullUrl: '/photo-1.jpg',
  uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0, canDelete: true, canRequestRemoval: true, alreadyExisted: false,
});
const loosePhoto = new Photo({
  id: 'photo-2', chapterId: null, baulId: 'baul-1', thumbnailUrl: '/photo-2-thumb.jpg', fullUrl: '/photo-2.jpg',
  uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0, canDelete: true, canRequestRemoval: true, alreadyExisted: false,
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/baules/:baulId/fotos/foto/:photoId" element={<BaulPhotoViewerRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulPhotoViewerRoute', () => {
  beforeEach(() => {
    useBaulesStore.setState({
      baules: [baul],
      chapters: { 'baul-1': chapters },
      loosePhotos: { 'baul-1': [] },
      baulPhotos: { 'baul-1': [chapterPhoto.id, loosePhoto.id] },
    });
    usePhotosStore.setState({ photosById: { [chapterPhoto.id]: chapterPhoto, [loosePhoto.id]: loosePhoto } });
    usePersonasStore.setState({ personas: { 'baul-1': [] }, taggedPersonas: {}, personaPhotos: {}, removalRequests: { 'baul-1': [] } });
    useRecuerdosStore.setState({ baulRecuerdos: { 'baul-1': [] }, recuerdos: {} });
  });

  it('shows a photo already loaded by the "Fotos" tab, with its chapter badge', async () => {
    renderAt('/baules/baul-1/fotos/foto/photo-1');

    expect(await screen.findByText('en «Verano 2024»')).toBeInTheDocument();
  });

  it('shows no chapter badge for a loose photo', async () => {
    renderAt('/baules/baul-1/fotos/foto/photo-2');

    await screen.findByRole('button', { name: 'Más opciones' });
    expect(screen.queryByText('en «Verano 2024»')).not.toBeInTheDocument();
  });

  it('does not offer "Mover a otro capítulo" — the selection can span several chapters', async () => {
    const user = userEvent.setup();
    renderAt('/baules/baul-1/fotos/foto/photo-1');
    await user.click(await screen.findByRole('button', { name: 'Más opciones' }));

    expect(screen.queryByText('Mover a otro capítulo')).not.toBeInTheDocument();
  });

  it('falls back to "not found" for a photo the tab has not loaded yet', async () => {
    renderAt('/baules/baul-1/fotos/foto/unknown-photo');

    expect(await screen.findByText('No se ha encontrado la foto.')).toBeInTheDocument();
  });

  // Con el filtro "Sin capítulo" activo, BaulPhotosTabContainer nunca llega a pedir la página
  // paginada de "Todas" — baulPhotos[baulId] se queda sin cargar y solo loosePhotos tiene la
  // foto. Antes esto hacía caer siempre en "no encontrada" — ver el bug que arregla este test.
  it('shows a loose photo opened with only "Sin capítulo" loaded (baulPhotos never fetched)', async () => {
    useBaulesStore.setState({ loosePhotos: { 'baul-1': [loosePhoto.id] }, baulPhotos: {} });

    renderAt('/baules/baul-1/fotos/foto/photo-2');

    await screen.findByRole('button', { name: 'Más opciones' });
    expect(screen.queryByText('No se ha encontrado la foto.')).not.toBeInTheDocument();
  });
});
