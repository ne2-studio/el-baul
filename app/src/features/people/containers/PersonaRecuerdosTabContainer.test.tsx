// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Recuerdo, Baul } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
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

import { api } from '@/api';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';

const baulId = 'baul-1';
const personaId = 'persona-1';

function recuerdo(overrides: Partial<Recuerdo> = {}): Recuerdo {
  return {
    id: 'r1', text: 'Un buen día', userName: 'Abuela', personaId: 'author-1', photoId: 'photo-1',
    createdAt: new Date().toISOString(), isOwn: false, ...overrides,
  } as Recuerdo;
}

function renderContainer() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<PersonaRecuerdosTabContainer baulId={baulId} personaId={personaId} />} />
        <Route path="/baules/:baulId/personas/:personaId/foto/:photoId" element={<div>Visor · persona</div>} />
        <Route path="/baules/:baulId/personas/:personaId" element={<div>Ficha</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PersonaRecuerdosTabContainer', () => {
  beforeEach(() => {
    useRecuerdosStore.setState({ recuerdos: {}, chapterRecuerdos: {}, baulRecuerdos: {} });
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    useBaulesStore.setState({ baules: [{ id: baulId, name: 'Familia García' } as Baul] });
    useAppConfigStore.setState({ chatEnabled: false, sharedLinksEnabled: false });
    vi.clearAllMocks();
  });

  it('renders only the recuerdos on photos where this persona is tagged', () => {
    usePersonasStore.setState({ personaPhotos: { [personaId]: ['photo-1'] } });
    useRecuerdosStore.setState({
      baulRecuerdos: {
        [baulId]: [
          recuerdo({ id: 'r1', text: 'De una foto etiquetada', photoId: 'photo-1' }),
          recuerdo({ id: 'r2', text: 'De otra foto', photoId: 'photo-2' }),
        ],
      },
    });

    renderContainer();

    expect(screen.getByText('De una foto etiquetada')).toBeInTheDocument();
    expect(screen.queryByText('De otra foto')).not.toBeInTheDocument();
  });

  it('includes recuerdos authored by other people, as long as the photo is tagged', () => {
    usePersonasStore.setState({ personaPhotos: { [personaId]: ['photo-1'] } });
    useRecuerdosStore.setState({
      baulRecuerdos: { [baulId]: [recuerdo({ id: 'r1', text: 'De otra persona', personaId: 'author-2', photoId: 'photo-1' })] },
    });

    renderContainer();

    expect(screen.getByText('De otra persona')).toBeInTheDocument();
  });

  it('shows the empty state when there are no matching recuerdos', () => {
    usePersonasStore.setState({ personaPhotos: { [personaId]: [] } });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });

    renderContainer();

    expect(screen.getByText('Todavía no hay recuerdos')).toBeInTheDocument();
    expect(screen.queryByText(/botón de abajo/)).not.toBeInTheDocument();
  });

  it('shares a recuerdo through the sharing flow only when links are enabled', async () => {
    const user = userEvent.setup();
    useAppConfigStore.setState({ sharedLinksEnabled: true });
    usePersonasStore.setState({ personaPhotos: { [personaId]: ['photo-1'] } });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });
    vi.mocked(api.recuerdos.createShareLink).mockResolvedValue({ url: 'https://el-baul.app/r/r1', token: 'tok' });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Compartir recuerdo' }));

    expect(api.recuerdos.createShareLink).toHaveBeenCalledWith('r1');
    expect(sharePublicLink).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://el-baul.app/r/r1' }));
  });

  it('does not offer sharing when links are disabled', () => {
    usePersonasStore.setState({ personaPhotos: { [personaId]: ['photo-1'] } });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();

    expect(screen.queryByRole('button', { name: 'Compartir recuerdo' })).not.toBeInTheDocument();
  });

  it('opens the persona-scoped photo viewer for "Ver foto"', async () => {
    const user = userEvent.setup();
    usePersonasStore.setState({ personaPhotos: { [personaId]: ['photo-1'] } });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo({ photoId: 'photo-1' })] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(screen.getByText('Visor · persona')).toBeInTheDocument();
  });

  it('navigates to the author persona ficha when clicking their name', async () => {
    const user = userEvent.setup();
    usePersonasStore.setState({ personaPhotos: { [personaId]: ['photo-1'] } });
    useRecuerdosStore.setState({
      baulRecuerdos: { [baulId]: [recuerdo({ personaId: 'author-2', photoId: 'photo-1', userName: 'Tío Pepe' })] },
    });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver perfil de Tío Pepe' }));

    expect(screen.getByText('Ficha')).toBeInTheDocument();
  });
});
