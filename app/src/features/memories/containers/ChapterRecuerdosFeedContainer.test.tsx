// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Recuerdo } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';
import { ChapterRecuerdosFeedContainer } from './ChapterRecuerdosFeedContainer';

vi.mock('@/features/memories/useCases', () => ({
  addChapterRecuerdo: vi.fn(),
  editRecuerdo: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: { recuerdos: { createShareLink: vi.fn() } },
  isForbiddenError: () => false,
}));

vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: vi.fn(),
}));

import { addChapterRecuerdo } from '@/features/memories/useCases';

const baulId = 'baul-1';
const chapterId = 'chapter-1';

function recuerdo(overrides: Partial<Recuerdo> = {}): Recuerdo {
  return {
    id: 'r1', text: 'Un buen día', userName: 'Papá', personaId: 'p1',
    createdAt: new Date().toISOString(), isOwn: false, ...overrides,
  } as Recuerdo;
}

function renderContainer() {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}/capitulos/${chapterId}`]}>
      <Routes>
        <Route
          path="/baules/:baulId/capitulos/:chapterId"
          element={
            <ChapterRecuerdosFeedContainer
              active
              baulId={baulId}
              baulName="Familia García"
              chapterId={chapterId}
              photos={[]}
              onSelectPhoto={vi.fn()}
              selectionMode={false}
            />
          }
        />
        <Route path="/baules/:baulId/personas/:personaId" element={<div>Ficha de persona</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ChapterRecuerdosFeedContainer', () => {
  beforeEach(() => {
    useRecuerdosStore.setState({ recuerdos: {}, chapterRecuerdos: {}, baulRecuerdos: {} });
    useAppConfigStore.setState({ chatEnabled: false, sharedLinksEnabled: false });
    useUIStore.setState({ showToast: false, toastMessage: '' });
    vi.clearAllMocks();
  });

  it('renders the recuerdos cached for this chapter', () => {
    useRecuerdosStore.setState({ chapterRecuerdos: { [chapterId]: [recuerdo()] } });

    renderContainer();

    expect(screen.getByText('Un buen día')).toBeInTheDocument();
  });

  it('navigates to the persona detail screen on user click, without a returnTab', async () => {
    const user = userEvent.setup();
    useRecuerdosStore.setState({ chapterRecuerdos: { [chapterId]: [recuerdo()] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver perfil de Papá' }));

    expect(screen.getByText('Ficha de persona')).toBeInTheDocument();
  });

  it('adds a recuerdo through the chapter use case and toasts on failure', async () => {
    const user = userEvent.setup();
    vi.mocked(addChapterRecuerdo).mockRejectedValue(new Error('boom'));

    renderContainer();
    await user.click(screen.getByRole('button', { name: /escribe lo que recuerdas/i }));
    await user.type(screen.getByPlaceholderText(/qué recuerdas/i), 'Un momento bonito');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(addChapterRecuerdo).toHaveBeenCalledWith(baulId, chapterId, 'Un momento bonito');
    await waitFor(() => expect(useUIStore.getState().toastMessage).toBe('Error al guardar el recuerdo'));
  });
});
