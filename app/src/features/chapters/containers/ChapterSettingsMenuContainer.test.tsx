// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { ChapterSettingsMenuContainer } from './ChapterSettingsMenuContainer';

vi.mock('@/features/chapters/useCases', () => ({
  renameChapter: vi.fn(),
  deleteChapter: vi.fn(),
  setChapterCover: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: { photos: { getPage: vi.fn() } },
}));

import { deleteChapter, renameChapter } from '@/features/chapters/useCases';

const baulId = 'baul-1';
const chapterId = 'chapter-1';

function baul(overrides: Partial<Baul> = {}): Baul {
  return { id: baulId, name: 'Familia García', chapterCount: 1, isCustodio: true, role: 'custodio', ...overrides } as Baul;
}

function renderContainer(props: Partial<React.ComponentProps<typeof ChapterSettingsMenuContainer>> = {}) {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}/capitulos/${chapterId}`]}>
      <Routes>
        <Route
          path="/baules/:baulId/capitulos/:chapterId"
          element={
            <ChapterSettingsMenuContainer
              baulId={baulId}
              chapterId={chapterId}
              chapterName="Verano 2024"
              photoCount={3}
              recuerdoCount={1}
              onEnterSelectionMode={vi.fn()}
              {...props}
            />
          }
        />
        <Route path="/baules/:baulId" element={<div>Vista del baúl</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ChapterSettingsMenuContainer', () => {
  beforeEach(() => {
    useBaulesStore.setState({ baules: [baul()] });
    vi.clearAllMocks();
  });

  it('renders nothing for the fotos sueltas virtual chapter', () => {
    renderContainer({ chapterId: null });

    expect(screen.queryByRole('button', { name: 'Opciones del capítulo' })).not.toBeInTheDocument();
  });

  it('shows the menu trigger for a real chapter', () => {
    renderContainer();

    expect(screen.getByRole('button', { name: 'Opciones del capítulo' })).toBeInTheDocument();
  });

  it('calls onEnterSelectionMode from the menu', async () => {
    const user = userEvent.setup();
    const onEnterSelectionMode = vi.fn();

    renderContainer({ onEnterSelectionMode });
    await user.click(screen.getByRole('button', { name: 'Opciones del capítulo' }));
    await user.click(await screen.findByText('Seleccionar fotos'));

    expect(onEnterSelectionMode).toHaveBeenCalled();
  });

  it('renames the chapter and closes the modal on success', async () => {
    const user = userEvent.setup();
    vi.mocked(renameChapter).mockResolvedValue(undefined);

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Opciones del capítulo' }));
    await user.click(await screen.findByText('Editar información del capítulo'));
    const nameInput = await screen.findByDisplayValue('Verano 2024');
    await user.clear(nameInput);
    await user.type(nameInput, 'Verano en la playa');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    expect(renameChapter).toHaveBeenCalledWith(baulId, chapterId, 'Verano en la playa');
    await waitFor(() => expect(screen.queryByDisplayValue('Verano en la playa')).not.toBeInTheDocument());
  });

  it('deletes the chapter and navigates back to the baúl for an admin', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteChapter).mockResolvedValue(undefined);

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Opciones del capítulo' }));
    await user.click(await screen.findByText('Eliminar capítulo'));
    await user.click(screen.getByRole('button', { name: /sí, eliminar capítulo/i }));

    expect(deleteChapter).toHaveBeenCalledWith(baulId, chapterId);
    await waitFor(() => expect(screen.getByText('Vista del baúl')).toBeInTheDocument());
  });

  it('hides the delete option for a non-admin', async () => {
    const user = userEvent.setup();
    useBaulesStore.setState({ baules: [baul({ isCustodio: false, role: 'colaborador' })] });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Opciones del capítulo' }));

    expect(screen.queryByText('Eliminar capítulo')).not.toBeInTheDocument();
  });
});
