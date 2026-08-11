// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { Persona, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { PhotoViewerContainer } from './PhotoViewerContainer';

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

import { loadRecuerdos, addRecuerdo } from '@/features/memories/useCases';
import { loadTaggedPersonas, setTaggedPersonas, submitRemovalRequest, deletePhoto, changePhotoDate, clearPhotoDate } from '@/features/photos/useCases';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';

const photos: Photo[] = [
  { id: 'photo-1', thumbnailUrl: '/photo-1-thumb.jpg', fullUrl: '/photo-1.jpg', recuerdoCount: 0 },
  { id: 'photo-2', thumbnailUrl: '/photo-2-thumb.jpg', fullUrl: '/photo-2.jpg', recuerdoCount: 0 },
];

const baulPersonas: Persona[] = [
  { id: 'p1', baulId: 'baul-1', nickname: 'Abuela Rosa', status: 'active', role: 'colaborador', invitedDate: 'hace 1 año' } as Persona,
];

function renderContainer(overrides: Partial<ComponentProps<typeof PhotoViewerContainer>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/baules/baul-1/fotos-sueltas/foto/photo-2']}>
      <Routes>
        <Route
          path="/baules/:baulId/fotos-sueltas/foto/:photoId"
          element={
            <PhotoViewerContainer
              photo={photos[1]}
              photos={photos}
              baulId="baul-1"
              baulName="Familia García"
              onClose={vi.fn()}
              onPhotoChange={vi.fn()}
              {...overrides}
            />
          }
        />
        <Route path="/baules/:baulId/personas/:personaId" element={<div>Ficha de persona</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Más opciones' }));
}

describe('PhotoViewerContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePersonasStore.setState({ personas: {}, taggedPersonas: {}, personaPhotos: {}, removalRequests: {} });
    useRecuerdosStore.setState({ recuerdos: {} });
    useAppConfigStore.setState({ sharedLinksEnabled: false });
    vi.mocked(loadRecuerdos).mockResolvedValue(undefined);
    vi.mocked(loadTaggedPersonas).mockResolvedValue(undefined);
  });

  it('loads recuerdos and tagged personas for the open photo on mount', async () => {
    // Distinct keys ('recuerdos' / 'tagged-personas') — without them, the second unkeyed
    // run() call would silently no-op as "already-pending" instead of actually running.
    renderContainer();

    await waitFor(() => expect(loadRecuerdos).toHaveBeenCalledWith('photo-2'));
    expect(loadTaggedPersonas).toHaveBeenCalledWith('photo-2');
  });

  it('shows the recuerdos spinner while they load, then hides it once loaded', async () => {
    let resolveLoad!: () => void;
    vi.mocked(loadRecuerdos).mockReturnValue(new Promise((resolve) => { resolveLoad = () => resolve(undefined); }));

    renderContainer();

    expect(await screen.findByLabelText('Cargando recuerdos')).toBeInTheDocument();

    resolveLoad();

    await waitFor(() => expect(screen.queryByLabelText('Cargando recuerdos')).not.toBeInTheDocument());
  });

  it('always offers tag and download, and share only when links are enabled', async () => {
    const user = userEvent.setup();
    renderContainer();
    await openMenu(user);

    expect(screen.getByText('Etiquetar personas')).toBeInTheDocument();
    expect(screen.getByText('Descargar foto original')).toBeInTheDocument();
    expect(screen.queryByText('Compartir foto')).not.toBeInTheDocument();
  });

  it('offers date change, and removal-request, universally with no chapter scope at all', async () => {
    const user = userEvent.setup();
    renderContainer({ isAdmin: false });
    await openMenu(user);

    expect(screen.getByText('Cambiar fecha')).toBeInTheDocument();
    expect(screen.getByText('Solicitar retirada')).toBeInTheDocument();
    expect(screen.queryByText('Retirar foto')).not.toBeInTheDocument();
  });

  it('offers delete (instead of removal-request) for an admin', async () => {
    const user = userEvent.setup();
    renderContainer({ isAdmin: true });
    await openMenu(user);

    expect(screen.getByText('Retirar foto')).toBeInTheDocument();
    expect(screen.queryByText('Solicitar retirada')).not.toBeInTheDocument();
  });

  it('does not offer "Borrar fecha" for a photo with no date', async () => {
    const user = userEvent.setup();
    renderContainer();
    await openMenu(user);

    expect(screen.queryByText('Borrar fecha')).not.toBeInTheDocument();
  });

  it('offers "Borrar fecha" for a photo with a date, and clears it on confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(clearPhotoDate).mockResolvedValue(undefined);
    const datedPhoto = { ...photos[1], date: { year: 2020, month: 5, day: 1 } };
    renderContainer({ photo: datedPhoto });
    await openMenu(user);
    await user.click(screen.getByText('Borrar fecha'));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar fecha' }));

    expect(clearPhotoDate).toHaveBeenCalledWith('baul-1', 'photo-2');
  });

  it('deletes the photo as an admin and closes the viewer', async () => {
    const user = userEvent.setup();
    vi.mocked(deletePhoto).mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderContainer({ isAdmin: true, onClose });
    await openMenu(user);
    await user.click(screen.getByText('Retirar foto'));
    await user.type(screen.getByPlaceholderText(/por qué se retira/i), 'Duplicada');
    await user.click(screen.getByRole('button', { name: /sí, retirar foto/i }));

    expect(deletePhoto).toHaveBeenCalledWith('baul-1', 'photo-2', 'Duplicada');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('changes the date from the menu', async () => {
    const user = userEvent.setup();
    vi.mocked(changePhotoDate).mockResolvedValue(undefined);
    renderContainer();
    await openMenu(user);
    await user.click(screen.getByText('Cambiar fecha'));
    await user.type(screen.getByLabelText('Año *'), '2020');
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(changePhotoDate).toHaveBeenCalledWith('baul-1', 'photo-2', expect.objectContaining({ year: 2020 }));
  });

  it('submits a removal request as a non-admin', async () => {
    const user = userEvent.setup();
    vi.mocked(submitRemovalRequest).mockResolvedValue(undefined);
    renderContainer({ isAdmin: false });
    await openMenu(user);
    await user.click(screen.getByText('Solicitar retirada'));
    await user.type(screen.getByPlaceholderText(/cuéntanos/i), 'No me gusta');
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(submitRemovalRequest).toHaveBeenCalledWith('baul-1', photos[1], 'No me gusta');
  });

  it('tags personas', async () => {
    const user = userEvent.setup();
    vi.mocked(setTaggedPersonas).mockResolvedValue(undefined);
    usePersonasStore.setState({ personas: { 'baul-1': baulPersonas }, taggedPersonas: { 'photo-2': [] } });
    renderContainer();
    await openMenu(user);
    await user.click(screen.getByText('Etiquetar personas'));
    await user.click(screen.getByText('Abuela Rosa'));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(setTaggedPersonas).toHaveBeenCalledWith('photo-2', ['p1']);
  });

  it('downloads the photo', async () => {
    const user = userEvent.setup();
    vi.mocked(api.photos.download).mockResolvedValue({ blob: new Blob(), fileName: 'foto.jpg' });
    renderContainer();
    await openMenu(user);
    await user.click(screen.getByText('Descargar foto original'));

    await waitFor(() => expect(api.photos.download).toHaveBeenCalledWith('photo-2'));
    expect(saveDownloadedPhoto).toHaveBeenCalled();
  });

  it('adds a recuerdo', async () => {
    const user = userEvent.setup();
    vi.mocked(addRecuerdo).mockResolvedValue(undefined);
    renderContainer();

    await user.type(screen.getByRole('textbox'), 'Qué buen día');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(addRecuerdo).toHaveBeenCalledWith('baul-1', 'photo-2', 'Qué buen día');
  });

  it('navigates to a tagged persona on click', async () => {
    const user = userEvent.setup();
    usePersonasStore.setState({
      personas: { 'baul-1': baulPersonas },
      taggedPersonas: { 'photo-2': [{ id: 'p1', nickname: 'Abuela Rosa' }] },
    });
    renderContainer();

    await user.click(screen.getByText('Abuela Rosa'));

    expect(await screen.findByText('Ficha de persona')).toBeInTheDocument();
  });

  it('merges extraMenuItems in, but keeps the destructive action last regardless', async () => {
    const user = userEvent.setup();
    renderContainer({
      isAdmin: true,
      extraMenuItems: [{ key: 'move', label: 'Mover a otro capítulo', icon: () => null, onSelect: vi.fn() }],
    });
    await openMenu(user);

    const moveItem = screen.getByText('Mover a otro capítulo');
    const deleteItem = screen.getByText('Retirar foto');
    // DOCUMENT_POSITION_FOLLOWING (4): moveItem comes before deleteItem in the DOM.
    expect(moveItem.compareDocumentPosition(deleteItem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
