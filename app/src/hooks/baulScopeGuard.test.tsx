// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Baul } from '@/types';
import { guardBaulScope } from './baulScopeGuard';

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0 } as Baul;

describe('guardBaulScope', () => {
  it('renders the default loading label while loading', () => {
    const guard = guardBaulScope({ baul: undefined, isLoading: true, refreshFailed: false, retry: vi.fn() });

    expect(guard.ready).toBe(false);
    render(<>{!guard.ready && guard.screen}</>);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renders a caller-supplied loading label while loading', () => {
    const guard = guardBaulScope(
      { baul: undefined, isLoading: true, refreshFailed: false, retry: vi.fn() },
      { loadingLabel: 'Cargando foto...' },
    );

    render(<>{!guard.ready && guard.screen}</>);
    expect(screen.getByText('Cargando foto...')).toBeInTheDocument();
  });

  it('renders the retry error screen when refreshing the baúl failed', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const guard = guardBaulScope({ baul: undefined, isLoading: false, refreshFailed: true, retry });

    render(<>{!guard.ready && guard.screen}</>);
    expect(screen.getByText('No se ha podido cargar el baúl')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalled();
  });

  it('renders a not-found message when the baúl is missing without a refresh failure', () => {
    const guard = guardBaulScope({ baul: undefined, isLoading: false, refreshFailed: false, retry: vi.fn() });

    render(<>{!guard.ready && guard.screen}</>);
    expect(screen.getByText('No se ha encontrado el baúl.')).toBeInTheDocument();
  });

  it('reports ready with a narrowed baúl once loaded', () => {
    const guard = guardBaulScope({ baul, isLoading: false, refreshFailed: false, retry: vi.fn() });

    expect(guard.ready).toBe(true);
    expect(guard.ready && guard.baul).toBe(baul);
  });
});
