// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { TvPairingRoute } from './TvPairingRoute';

vi.mock('@/api', async () => {
  const actual = await vi.importActual<typeof import('@/api')>('@/api');
  return {
    ...actual,
    api: {
      tvPairings: { claim: vi.fn() },
    },
  };
});

import { api, ApiError } from '@/api';

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 2 } as Baul;

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/tv/vincular/abc123']}>
      <Routes>
        <Route path="/tv/vincular/:code" element={<TvPairingRoute />} />
        <Route path="/baules" element={<div>Lista de baúles</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TvPairingRoute', () => {
  beforeEach(() => {
    useBaulesStore.setState({ baules: [baul], isLoading: false });
    vi.clearAllMocks();
  });

  it('claims the pairing with the chosen baúl and shows the confirmation screen', async () => {
    const user = userEvent.setup();
    vi.mocked(api.tvPairings.claim).mockResolvedValue(undefined);

    renderRoute();
    await user.click(screen.getByText('Familia García'));

    expect(api.tvPairings.claim).toHaveBeenCalledWith('abc123', 'baul-1');
    expect(await screen.findByText('Ya se está mostrando en tu TV')).toBeInTheDocument();
  });

  it('shows the expired screen when the code is no longer valid', async () => {
    const user = userEvent.setup();
    vi.mocked(api.tvPairings.claim).mockRejectedValue(new ApiError(404, 'not found', {}));

    renderRoute();
    await user.click(screen.getByText('Familia García'));

    expect(await screen.findByText('Este código ya no es válido')).toBeInTheDocument();
  });
});
