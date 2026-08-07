// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Recuerdo, Baul } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { PersonaRecuerdosTabContainer } from './PersonaRecuerdosTabContainer';

vi.mock('@/api', () => ({
  api: { recuerdos: { createShareLink: vi.fn() } },
  isForbiddenError: () => false,
  isUnauthorizedError: () => false,
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
const personaId = 'persona-1';

function recuerdo(overrides: Partial<Recuerdo> = {}): Recuerdo {
  return {
    id: 'r1', text: 'Un buen día', userName: 'Abuela', personaId,
    createdAt: new Date().toISOString(), isOwn: false, ...overrides,
  } as Recuerdo;
}

function renderContainer() {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}/personas/${personaId}`]}>
      <Routes>
        <Route
          path="/baules/:baulId/personas/:personaId"
          element={<PersonaRecuerdosTabContainer baulId={baulId} personaId={personaId} />}
        />
        <Route path="/baules/:baulId/capitulos/:chapterId" element={<div>Capítulo</div>} />
        <Route path="/baules/:baulId/fotos-sueltas/foto/:photoId" element={<div>Visor · fotos sueltas</div>} />
        <Route path="/baules/:baulId/capitulos/:chapterId/foto/:photoId" element={<div>Visor · capítulo</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PersonaRecuerdosTabContainer', () => {
  beforeEach(() => {
    useRecuerdosStore.setState({ recuerdos: {}, chapterRecuerdos: {}, baulRecuerdos: {} });
    useBaulesStore.setState({ baules: [{ id: baulId, name: 'Familia García' } as Baul] });
    useAppConfigStore.setState({ chatEnabled: false, sharedLinksEnabled: false });
    vi.clearAllMocks();
  });

  it('renders only the recuerdos authored by this persona', () => {
    useRecuerdosStore.setState({
      baulRecuerdos: { [baulId]: [recuerdo({ id: 'r1', text: 'De la abuela' }), recuerdo({ id: 'r2', text: 'De otra persona', personaId: 'persona-2' })] },
    });

    renderContainer();

    expect(screen.getByText('De la abuela')).toBeInTheDocument();
    expect(screen.queryByText('De otra persona')).not.toBeInTheDocument();
  });

  it('shows the empty state when this persona has no recuerdos', () => {
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });

    renderContainer();

    expect(screen.getByText('Todavía no hay recuerdos')).toBeInTheDocument();
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

  it('loads the chapter photos before navigating to the chapter itself', async () => {
    const user = userEvent.setup();
    vi.mocked(loadChapterPhotos).mockResolvedValue(undefined);
    useRecuerdosStore.setState({
      baulRecuerdos: { [baulId]: [recuerdo({ chapterId: 'chapter-1', chapterName: 'Verano 2024' })] },
    });

    renderContainer();
    await user.click(screen.getByRole('button', { name: /Verano 2024/ }));

    expect(loadChapterPhotos).toHaveBeenCalledWith('chapter-1');
    expect(screen.getByText('Capítulo')).toBeInTheDocument();
  });
});
