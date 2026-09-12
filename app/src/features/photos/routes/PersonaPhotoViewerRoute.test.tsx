// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Chapter, Persona, Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useUIStore } from '@/store/uiStore';
import { PersonaPhotoViewerRoute } from './PersonaPhotoViewerRoute';
import { movePhotos } from '@/features/photos/useCases';

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
  movePhotos: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/chapters/useCases', () => ({
  createChapter: vi.fn(),
}));

vi.mock('@/features/memories/useCases', () => ({
  loadRecuerdos: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api', () => ({
  api: {
    photos: { download: vi.fn(), createShareLink: vi.fn() },
    recuerdos: { getAll: vi.fn().mockResolvedValue([]), createShareLink: vi.fn() },
    baules: { getPersonaScope: vi.fn() },
  },
  isForbiddenError: () => false,
  isUnauthorizedError: () => false,
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 2, role: 'administrador' } as Baul;
const persona = { id: 'persona-1', baulId: 'baul-1', nickname: 'Abuela', status: 'active', role: 'colaborador', isCustodio: false, invitedDate: 'hace 1 día' } as Persona;

const chapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2024', photoCount: 3, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: 'c2', name: 'Navidad', photoCount: 1, lastUpdated: 'hace 1 mes', recuerdoCount: 0, undatedPhotoCount: 0 },
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
        <Route path="/baules/:baulId/personas/:personaId/foto/:photoId" element={<PersonaPhotoViewerRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Más opciones' }));
}

describe('PersonaPhotoViewerRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBaulesStore.setState({
      baules: [baul],
      chapters: { 'baul-1': chapters },
      loosePhotos: { 'baul-1': [] },
    });
    usePhotosStore.setState({ photosById: { [chapterPhoto.id]: chapterPhoto, [loosePhoto.id]: loosePhoto } });
    usePersonasStore.setState({
      personas: { 'baul-1': [persona] },
      taggedPersonas: {},
      personaPhotos: { 'persona-1': [chapterPhoto.id, loosePhoto.id] },
      removalRequests: { 'baul-1': [] },
      relationships: { 'baul-1': [] },
      spouseRelationships: { 'baul-1': [] },
    });
    useRecuerdosStore.setState({ baulRecuerdos: { 'baul-1': [] }, recuerdos: {} });
  });

  // Regression for the bug reported in issue #68: this viewer used to mount PhotoViewerContainer
  // directly, which never offers "Mover a otro capítulo" — the option was entirely missing from
  // the persona photos viewer regardless of entry point.
  it('offers "Mover a otro capítulo" for a tagged photo already in a chapter', async () => {
    const user = userEvent.setup();
    renderAt('/baules/baul-1/personas/persona-1/foto/photo-1');
    await openMenu(user);

    expect(screen.getByText('Mover a otro capítulo')).toBeInTheDocument();
  });

  it('offers "Mover a otro capítulo" for a loose tagged photo too', async () => {
    const user = userEvent.setup();
    renderAt('/baules/baul-1/personas/persona-1/foto/photo-2');
    await openMenu(user);

    expect(screen.getByText('Mover a otro capítulo')).toBeInTheDocument();
  });

  // After a move here the user should stay on the same photo/position — unlike the chapter and
  // upload-batch viewers, which navigate into the destination chapter.
  it('moves the photo and stays on it, without navigating away', async () => {
    const user = userEvent.setup();
    vi.mocked(movePhotos).mockResolvedValue(undefined);
    renderAt('/baules/baul-1/personas/persona-1/foto/photo-1');
    await openMenu(user);
    await user.click(screen.getByText('Mover a otro capítulo'));
    await user.click(screen.getByText('Navidad'));
    await user.click(screen.getByRole('button', { name: /mover aquí/i }));

    expect(movePhotos).toHaveBeenCalledWith('baul-1', 'c1', ['photo-1'], 'c2');
    await waitFor(() => expect(useUIStore.getState().toastMessage).toBe('Foto movida'));
    expect(screen.getByRole('button', { name: 'Más opciones' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mover aquí/i })).not.toBeInTheDocument();
  });
});
