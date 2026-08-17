// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useUIStore } from '@/store/uiStore';
import { CreateChapterModalRoute } from './CreateChapterModalRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const createChapter = vi.fn();
vi.mock('@/features/chapters/useCases', () => ({
  createChapter: (...args: unknown[]) => createChapter(...args),
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 1, role: 'administrador' } as Baul;

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/baules/baul-1/capitulos/nuevo']}>
      <Routes>
        <Route path="/baules/:baulId/capitulos/nuevo" element={<CreateChapterModalRoute />} />
        <Route path="/baules/:baulId/capitulos/:chapterId" element={<div>Pantalla del capítulo</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CreateChapterModalRoute', () => {
  beforeEach(() => {
    createChapter.mockReset();
    useBaulesStore.setState({ baules: [baul], chapters: { 'baul-1': [] } });
    useUIStore.setState({ showToast: false, toastMessage: '' });
  });

  it('navigates to the new chapter and shows a success toast after creating it', async () => {
    createChapter.mockResolvedValue({ id: 'chapter-new', name: 'Verano 2018' });
    const user = userEvent.setup();
    renderRoute();

    await user.type(screen.getByPlaceholderText('Verano 2018'), 'Verano 2018');
    await user.click(screen.getByRole('button', { name: 'Crear capítulo' }));

    expect(await screen.findByText('Pantalla del capítulo')).toBeInTheDocument();
    expect(createChapter).toHaveBeenCalledWith('baul-1', 'Verano 2018');
    await waitFor(() => {
      expect(useUIStore.getState().showToast).toBe(true);
      expect(useUIStore.getState().toastMessage).toBe('Capítulo creado');
    });
  });
});
