// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chapter, Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { BaulChaptersTabContainer } from './BaulChaptersTabContainer';

vi.mock('@/features/chapters/useCases', () => ({
  createChapter: vi.fn(),
}));

import { createChapter } from '@/features/chapters/useCases';

const baulId = 'baul-1';

function chapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'c1', name: 'Verano 2024', photoCount: 3, lastUpdated: 'hace 1 día', recuerdoCount: 0,
    undatedPhotoCount: 0, minDate: { year: 2024 }, maxDate: { year: 2024 }, ...overrides,
  } as Chapter;
}

function renderContainer(onSelectChapter = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}`]}>
      <Routes>
        <Route
          path="/baules/:baulId"
          element={<BaulChaptersTabContainer baulId={baulId} onSelectChapter={onSelectChapter} />}
        />
        <Route path="/baules/:baulId/fotos-sueltas" element={<div>Fotos sueltas</div>} />
        <Route path="/baules/:baulId/fotos-sueltas/confirmar" element={<div>Confirmar subida</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulChaptersTabContainer', () => {
  beforeEach(() => {
    useBaulesStore.getState().reset();
    vi.clearAllMocks();
  });

  it('renders the empty state when there are no chapters or loose photos', () => {
    renderContainer();

    expect(screen.getByText('Este baúl está vacío')).toBeInTheDocument();
  });

  it('renders chapters and calls onSelectChapter on click', async () => {
    const user = userEvent.setup();
    const onSelectChapter = vi.fn();
    useBaulesStore.setState({ chapters: { [baulId]: [chapter()] } });

    renderContainer(onSelectChapter);
    await user.click(screen.getByText('Verano 2024'));

    expect(onSelectChapter).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('renders the loose-photos card and navigates on click', async () => {
    const user = userEvent.setup();
    const loosePhoto = { id: 'lp1', thumbnailUrl: '/lp1-thumb.jpg' } as Photo;
    useBaulesStore.setState({ loosePhotos: { [baulId]: [loosePhoto] } });

    renderContainer();
    await user.click(screen.getByText('Fotos sueltas'));

    expect(screen.getByText('Fotos sueltas')).toBeInTheDocument();
  });

  it('creates a chapter from the FAB', async () => {
    const user = userEvent.setup();
    vi.mocked(createChapter).mockResolvedValue(chapter());
    useBaulesStore.setState({ chapters: { [baulId]: [chapter()] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByText('Nuevo capítulo'));
    await user.type(screen.getByPlaceholderText('Verano 2018'), 'Navidad');
    await user.click(screen.getByRole('button', { name: /crear capítulo/i }));

    expect(createChapter).toHaveBeenCalledWith(baulId, 'Navidad');
  });

  it('navigates to the upload flow from the FAB', async () => {
    const user = userEvent.setup();
    useBaulesStore.setState({ chapters: { [baulId]: [chapter()] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByText('Subir fotos'));

    expect(screen.getByText('Confirmar subida')).toBeInTheDocument();
  });
});
