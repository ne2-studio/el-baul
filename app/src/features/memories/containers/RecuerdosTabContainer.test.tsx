// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Recuerdo } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { RecuerdosTabContainer } from './RecuerdosTabContainer';

vi.mock('@/api', () => ({
  api: { recuerdos: { createShareLink: vi.fn() } },
  isForbiddenError: () => false,
}));

vi.mock('@/features/memories/useCases', () => ({
  editRecuerdo: vi.fn(),
}));

vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: vi.fn(),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadChapterPhotos: vi.fn(),
}));

import { api } from '@/api';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { loadChapterPhotos } from '@/features/photos/useCases';

const baulId = 'baul-1';

function recuerdo(overrides: Partial<Recuerdo> = {}): Recuerdo {
  return {
    id: 'r1', text: 'Un buen día', userName: 'Papá', personaId: 'p1',
    createdAt: new Date().toISOString(), isOwn: false, ...overrides,
  } as Recuerdo;
}

function renderContainer() {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}`]}>
      <Routes>
        <Route
          path="/baules/:baulId"
          element={<RecuerdosTabContainer baulId={baulId} baulName="Familia García" />}
        />
        <Route path="/baules/:baulId/personas/:personaId" element={<div>Ficha de persona</div>} />
        <Route path="/baules/:baulId/recordar" element={<div>Chat</div>} />
        <Route path="/baules/:baulId/fotos-sueltas/foto/:photoId" element={<div>Visor · fotos sueltas</div>} />
        <Route path="/baules/:baulId/capitulos/:chapterId/foto/:photoId" element={<div>Visor · capítulo</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RecuerdosTabContainer', () => {
  beforeEach(() => {
    useRecuerdosStore.setState({ recuerdos: {}, chapterRecuerdos: {}, baulRecuerdos: {} });
    useAppConfigStore.setState({ chatEnabled: false, sharedLinksEnabled: false });
    vi.clearAllMocks();
  });

  it('renders the recuerdos cached for this baúl', () => {
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();

    expect(screen.getByText('Un buen día')).toBeInTheDocument();
  });

  it('navigates to the persona detail screen on user click', async () => {
    const user = userEvent.setup();
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver perfil de Papá' }));

    expect(screen.getByText('Ficha de persona')).toBeInTheDocument();
  });

  it('shares a recuerdo through the sharing flow only when links are enabled', async () => {
    const user = userEvent.setup();
    useAppConfigStore.setState({ sharedLinksEnabled: true });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });
    vi.mocked(api.recuerdos.createShareLink).mockResolvedValue({ url: 'https://el-baul.app/r/r1', token: 'tok' });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Compartir recuerdo' }));

    expect(api.recuerdos.createShareLink).toHaveBeenCalledWith('r1');
    expect(sharePublicLink).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://el-baul.app/r/r1' }));
  });

  it('does not offer sharing when links are disabled', () => {
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();

    expect(screen.queryByRole('button', { name: 'Compartir recuerdo' })).not.toBeInTheDocument();
  });

  it('navigates to the AI chat via the FAB only when chat is enabled', async () => {
    const user = userEvent.setup();
    useAppConfigStore.setState({ chatEnabled: true });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: /ayúdame a recordar/i }));

    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('hides the chat FAB when chat is disabled', () => {
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();

    expect(screen.queryByRole('button', { name: /ayúdame a recordar/i })).not.toBeInTheDocument();
  });

  it('opens a loose photo directly, without loading chapter photos first', async () => {
    const user = userEvent.setup();
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo({ photoId: 'photo-1', chapterId: undefined })] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(loadChapterPhotos).not.toHaveBeenCalled();
    expect(screen.getByText('Visor · fotos sueltas')).toBeInTheDocument();
  });

  it('loads the chapter photos before opening a photo that belongs to a chapter', async () => {
    const user = userEvent.setup();
    vi.mocked(loadChapterPhotos).mockResolvedValue(undefined);
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo({ photoId: 'photo-1', chapterId: 'chapter-1' })] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(loadChapterPhotos).toHaveBeenCalledWith('chapter-1');
    expect(screen.getByText('Visor · capítulo')).toBeInTheDocument();
  });
});
