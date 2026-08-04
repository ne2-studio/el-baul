// @vitest-environment jsdom
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';
import { SelectBaulForShareRoute } from './SelectBaulForShareRoute';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/native/shareReceiver', () => ({
  ShareReceiver: { clearPendingShare: vi.fn().mockResolvedValue(undefined) },
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0 } as Baul;
const selectedPhotos = [{ id: 'photo-1' }] as unknown as SelectedPhoto[];

function ConfirmarScreen() {
  const location = useLocation();
  const state = location.state as { selectedPhotos?: SelectedPhoto[] } | null;
  return <div>Confirmar {state?.selectedPhotos?.length ?? 0} fotos</div>;
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/compartir']}>
      <Routes>
        <Route path="/compartir" element={<SelectBaulForShareRoute />} />
        <Route path="/baules" element={<div>Lista de baúles</div>} />
        <Route path="/baules/:baulId/fotos-sueltas/confirmar" element={<ConfirmarScreen />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SelectBaulForShareRoute', () => {
  beforeEach(() => {
    useIncomingShareStore.setState({
      share: { shareId: 'share-1', files: [] },
      selectedPhotos,
    });
    useBaulesStore.setState({
      baules: [baul],
      isLoading: false,
      loadChapters: vi.fn().mockResolvedValue(undefined),
      loadLoosePhotos: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('redirects to /baules when there is nothing pending to share', () => {
    useIncomingShareStore.setState({ share: null, selectedPhotos: [] });

    renderRoute();

    expect(screen.getByText('Lista de baúles')).toBeInTheDocument();
  });

  it('navigates to the confirmation screen and does not get hijacked back to /baules once clear() empties the store', async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.click(screen.getByText('Familia García'));

    // handleSelectBaul navigates to confirmar and then calls clear(), which empties
    // `share`/`selectedPhotos` and re-renders this still-mounted component. Without the
    // hasNavigatedRef guard, that re-render re-evaluates the early-redirect condition with
    // an empty store and bounces back to /baules, hijacking the navigation that already happened.
    expect(await screen.findByText('Confirmar 1 fotos')).toBeInTheDocument();
    expect(screen.queryByText('Lista de baúles')).not.toBeInTheDocument();
    expect(useIncomingShareStore.getState().share).toBeNull();
  });
});
