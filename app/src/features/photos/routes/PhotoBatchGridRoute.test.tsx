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
import { PhotoBatchGridRoute } from './PhotoBatchGridRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/features/people/useCases', () => ({
  loadPersonas: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadPhotoBatchPhotos: vi.fn().mockResolvedValue(undefined),
  movePhotos: vi.fn().mockResolvedValue(undefined),
  loadRemovalRequests: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/chapters/useCases', () => ({
  addTaggedPersonasBatch: vi.fn().mockResolvedValue(undefined),
  changePhotoDateBatch: vi.fn().mockResolvedValue(undefined),
  clearPhotoDateBatch: vi.fn().mockResolvedValue(undefined),
  createChapter: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/baules/useCases', () => ({
  loadChapters: vi.fn().mockResolvedValue(undefined),
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 2, role: 'administrador' } as Baul;

const chapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2024', photoCount: 3, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: 'c2', name: 'Navidad', photoCount: 1, lastUpdated: 'hace 1 mes', recuerdoCount: 0, undatedPhotoCount: 0 },
];

const photo1 = new Photo({
  id: 'photo-1', chapterId: 'c1', baulId: 'baul-1', thumbnailUrl: '/photo-1-thumb.jpg', fullUrl: '/photo-1.jpg',
  uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0, canDelete: false, canRequestRemoval: true, alreadyExisted: false,
});
const photo2 = new Photo({
  id: 'photo-2', chapterId: null, baulId: 'baul-1', thumbnailUrl: '/photo-2-thumb.jpg', fullUrl: '/photo-2.jpg',
  uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0, canDelete: false, canRequestRemoval: true, alreadyExisted: false,
});

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/baules/baul-1/subida/batch-1']}>
      <Routes>
        <Route path="/baules/:baulId/subida/:batchId" element={<PhotoBatchGridRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PhotoBatchGridRoute', () => {
  beforeEach(() => {
    useBaulesStore.setState({
      baules: [baul],
      chapters: { 'baul-1': chapters },
      loosePhotos: { 'baul-1': [] },
      photoBatchPhotos: { 'batch-1': [photo1.id, photo2.id] },
    });
    usePhotosStore.setState({ photosById: { [photo1.id]: photo1, [photo2.id]: photo2 } });
    usePersonasStore.setState({ personas: { 'baul-1': [] }, taggedPersonas: {}, personaPhotos: {}, removalRequests: {} });
    useRecuerdosStore.setState({ baulRecuerdos: { 'baul-1': [] }, recuerdos: {} });
  });

  it('renders the batch photos', () => {
    renderRoute();

    expect(screen.getAllByRole('checkbox', { name: 'Seleccionar foto' })).toHaveLength(2);
  });

  it('enters selection mode and shows the batch action bar when a photo is selected', async () => {
    const user = userEvent.setup();
    renderRoute();

    const [firstCheckbox] = screen.getAllByRole('checkbox', { name: 'Seleccionar foto' });
    await user.click(firstCheckbox);

    expect(screen.getByText('1 seleccionada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();

    // chapterId=null (a batch has no single source chapter) offers "crear nuevo capítulo",
    // same convention as fotos sueltas, and moveableChapters is every real chapter in the baúl.
    expect(screen.getByText('Cambiar fecha')).toBeInTheDocument();
    expect(screen.getByText('Mover')).toBeInTheDocument();
    expect(screen.getByText('Crear nuevo capítulo')).toBeInTheDocument();
    expect(screen.getByText('Etiquetar personas')).toBeInTheDocument();
  });

  it('exits selection mode when "Cancelar" is pressed', async () => {
    const user = userEvent.setup();
    renderRoute();

    const [firstCheckbox] = screen.getAllByRole('checkbox', { name: 'Seleccionar foto' });
    await user.click(firstCheckbox);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('1 seleccionada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
  });
});
