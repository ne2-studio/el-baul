// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chapter, Persona, Photo } from '@/types';
// Exercised through PhotoViewer (its only caller) rather than the hook in isolation — the
// hook returns menuItems/modals that need a real render surface to interact with, and
// PhotoViewer is exactly that surface. This file lives in containers/, not components/,
// because it needs to mock the use cases the hook calls, which the componentBoundaryRule
// forbids importing from anywhere under features/*/components/**.
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { PhotoViewerChapterScope } from './usePhotoSettingsMenu';

vi.mock('@/features/photos/useCases', () => ({
  submitRemovalRequest: vi.fn(),
  setTaggedPersonas: vi.fn(),
  movePhotos: vi.fn(),
  deletePhoto: vi.fn(),
  changePhotoDate: vi.fn(),
}));

vi.mock('@/features/baules/useCases', () => ({
  setBaulCover: vi.fn(),
}));

vi.mock('@/features/chapters/useCases', () => ({
  setChapterCover: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: {
    photos: { download: vi.fn(), createShareLink: vi.fn() },
  },
  isForbiddenError: () => false,
}));

vi.mock('@/utils/downloadFile', () => ({
  saveDownloadedPhoto: vi.fn(),
}));

vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: vi.fn(),
}));

import { submitRemovalRequest, setTaggedPersonas, movePhotos, deletePhoto, changePhotoDate } from '@/features/photos/useCases';
import { setBaulCover } from '@/features/baules/useCases';
import { setChapterCover } from '@/features/chapters/useCases';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';

const photos: Photo[] = [
  { id: 'photo-1', thumbnailUrl: '/photo-1-thumb.jpg', fullUrl: '/photo-1.jpg', recuerdoCount: 0 },
  { id: 'photo-2', thumbnailUrl: '/photo-2-thumb.jpg', fullUrl: '/photo-2.jpg', recuerdoCount: 0 },
];

const chapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2024', photoCount: 3, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: 'c2', name: 'Navidad', photoCount: 1, lastUpdated: 'hace 1 mes', recuerdoCount: 0, undatedPhotoCount: 0 },
];

const baulPersonas: Persona[] = [
  { id: 'p1', baulId: 'baul-1', nickname: 'Abuela Rosa', status: 'active', role: 'colaborador', invitedDate: 'hace 1 año' } as Persona,
];

const chapterScope: PhotoViewerChapterScope = {
  apiChapterId: 'c1',
  allChapters: chapters,
  currentChapter: chapters[0],
  onMoved: vi.fn(),
  onDeleted: vi.fn(),
};

function renderViewer(overrides: Partial<ComponentProps<typeof PhotoViewer>> = {}) {
  render(
    <PhotoViewer
      photo={photos[1]}
      photos={photos}
      onClose={vi.fn()}
      onPhotoChange={vi.fn()}
      baulId="baul-1"
      baulName="Familia García"
      onAddRecuerdo={vi.fn()}
      {...overrides}
    />
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Más opciones' }));
}

describe('usePhotoSettingsMenu (via PhotoViewer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always offers tag and download, and share only when links are enabled', async () => {
    const user = userEvent.setup();
    renderViewer({ sharedLinksEnabled: false });
    await openMenu(user);

    expect(screen.getByText('Etiquetar personas')).toBeInTheDocument();
    expect(screen.getByText('Descargar foto original')).toBeInTheDocument();
    expect(screen.queryByText('Compartir foto')).not.toBeInTheDocument();
  });

  it('offers chapter-scoped actions only when a chapter scope is given', async () => {
    const user = userEvent.setup();
    renderViewer();
    await openMenu(user);

    expect(screen.queryByText('Mover a otro capítulo')).not.toBeInTheDocument();
    expect(screen.queryByText('Cambiar fecha')).not.toBeInTheDocument();
    expect(screen.queryByText('Solicitar retirada')).not.toBeInTheDocument();
    expect(screen.queryByText('Establecer como portada del capítulo')).not.toBeInTheDocument();
  });

  it('tags personas', async () => {
    const user = userEvent.setup();
    vi.mocked(setTaggedPersonas).mockResolvedValue(undefined);
    renderViewer({ baulPersonas, taggedPersonas: [] });
    await openMenu(user);
    await user.click(screen.getByText('Etiquetar personas'));
    await user.click(screen.getByText('Abuela Rosa'));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(setTaggedPersonas).toHaveBeenCalledWith('photo-2', ['p1']);
  });

  it('downloads the photo', async () => {
    const user = userEvent.setup();
    vi.mocked(api.photos.download).mockResolvedValue({ blob: new Blob(), fileName: 'foto.jpg' });
    renderViewer();
    await openMenu(user);
    await user.click(screen.getByText('Descargar foto original'));

    await waitFor(() => expect(api.photos.download).toHaveBeenCalledWith('photo-2'));
    expect(saveDownloadedPhoto).toHaveBeenCalled();
  });

  it('shares the photo', async () => {
    const user = userEvent.setup();
    vi.mocked(api.photos.createShareLink).mockResolvedValue({ url: 'https://el-baul.app/f/1', token: 'tok' });
    renderViewer({ sharedLinksEnabled: true });
    await openMenu(user);
    await user.click(screen.getByText('Compartir foto'));

    await waitFor(() => expect(api.photos.createShareLink).toHaveBeenCalledWith('photo-2'));
    expect(sharePublicLink).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://el-baul.app/f/1' }));
  });

  it('sets the chapter cover when inside a real chapter', async () => {
    const user = userEvent.setup();
    vi.mocked(setChapterCover).mockResolvedValue(undefined);
    renderViewer({ chapter: chapterScope });
    await openMenu(user);
    await user.click(screen.getByText('Establecer como portada del capítulo'));

    expect(setChapterCover).toHaveBeenCalledWith('baul-1', 'c1', 'photo-2', '/photo-2-thumb.jpg');
  });

  it('sets the baúl cover for an admin', async () => {
    const user = userEvent.setup();
    vi.mocked(setBaulCover).mockResolvedValue(undefined);
    renderViewer({ chapter: chapterScope, isAdmin: true });
    await openMenu(user);
    await user.click(screen.getByText('Establecer como portada del baúl'));

    expect(setBaulCover).toHaveBeenCalledWith('baul-1', 'photo-2', '/photo-2-thumb.jpg');
  });

  it('hides baúl-cover and delete for a non-admin, offers removal-request instead', async () => {
    const user = userEvent.setup();
    renderViewer({ chapter: chapterScope, isAdmin: false });
    await openMenu(user);

    expect(screen.queryByText('Establecer como portada del baúl')).not.toBeInTheDocument();
    expect(screen.queryByText('Retirar foto')).not.toBeInTheDocument();
    expect(screen.getByText('Solicitar retirada')).toBeInTheDocument();
  });

  it('moves the photo to another chapter and notifies the caller', async () => {
    const user = userEvent.setup();
    vi.mocked(movePhotos).mockResolvedValue(undefined);
    const onMoved = vi.fn();
    renderViewer({ chapter: { ...chapterScope, onMoved } });
    await openMenu(user);
    await user.click(screen.getByText('Mover a otro capítulo'));
    await user.click(screen.getByText('Navidad'));
    await user.click(screen.getByRole('button', { name: /mover aquí/i }));

    expect(movePhotos).toHaveBeenCalledWith('baul-1', 'c1', ['photo-2'], 'c2');
    await waitFor(() => expect(onMoved).toHaveBeenCalledWith('c2'));
  });

  it('changes the date from the menu, and the inline body affordance opens the same modal', async () => {
    const user = userEvent.setup();
    vi.mocked(changePhotoDate).mockResolvedValue(undefined);
    renderViewer({ chapter: chapterScope });

    await user.click(screen.getByText('Sin fecha · Toca para añadir'));
    await user.type(screen.getByLabelText('Año *'), '2020');
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(changePhotoDate).toHaveBeenCalledWith('baul-1', 'c1', 'photo-2', expect.objectContaining({ year: 2020 }));
  });

  it('submits a removal request as a non-admin', async () => {
    const user = userEvent.setup();
    vi.mocked(submitRemovalRequest).mockResolvedValue(undefined);
    renderViewer({ chapter: chapterScope, isAdmin: false });
    await openMenu(user);
    await user.click(screen.getByText('Solicitar retirada'));
    await user.type(screen.getByPlaceholderText(/cuéntanos/i), 'No me gusta');
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(submitRemovalRequest).toHaveBeenCalledWith('baul-1', photos[1], 'No me gusta');
  });

  it('deletes the photo as an admin and notifies the caller', async () => {
    const user = userEvent.setup();
    vi.mocked(deletePhoto).mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    renderViewer({ chapter: { ...chapterScope, onDeleted }, isAdmin: true });
    await openMenu(user);
    await user.click(screen.getByText('Retirar foto'));
    await user.type(screen.getByPlaceholderText(/por qué se retira/i), 'Duplicada');
    await user.click(screen.getByRole('button', { name: /sí, retirar foto/i }));

    expect(deletePhoto).toHaveBeenCalledWith('baul-1', 'c1', 'photo-2', 'Duplicada');
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });
});
