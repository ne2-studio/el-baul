// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Persona } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { PersonaBiografiaTabContainer } from './PersonaBiografiaTabContainer';

vi.mock('@/features/people/useCases', () => ({
  updatePersonaBiografia: vi.fn(),
}));

import { updatePersonaBiografia } from '@/features/people/useCases';

const baulId = 'baul-1';

function baul(role: Baul['role']): Baul {
  return { id: baulId, name: 'Familia García', chapterCount: 1, role } as Baul;
}

function persona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'p1', baulId, nickname: 'Abuela Rosa', status: 'active', role: 'colaborador',
    invitedDate: 'hace 1 año', ...overrides,
  } as Persona;
}

describe('PersonaBiografiaTabContainer', () => {
  beforeEach(() => {
    useBaulesStore.getState().reset();
    vi.clearAllMocks();
  });

  it('renders the biografía text when present', () => {
    useBaulesStore.setState({ baules: [baul('colaborador')] });
    render(<PersonaBiografiaTabContainer baulId={baulId} persona={persona({ biografia: 'Le encanta pintar.' })} />);

    expect(screen.getByText('Le encanta pintar.')).toBeInTheDocument();
  });

  it('renders the empty state when there is no biografía', () => {
    useBaulesStore.setState({ baules: [baul('colaborador')] });
    render(<PersonaBiografiaTabContainer baulId={baulId} persona={persona()} />);

    expect(screen.getByText('Todavía no hay biografía')).toBeInTheDocument();
  });

  it('shows the edit FAB for a member of the baúl', () => {
    useBaulesStore.setState({ baules: [baul('colaborador')] });
    render(<PersonaBiografiaTabContainer baulId={baulId} persona={persona()} />);

    expect(screen.getByRole('button', { name: /editar biografía/i })).toBeInTheDocument();
  });

  it('saves the biografía and closes the modal on success', async () => {
    const user = userEvent.setup();
    useBaulesStore.setState({ baules: [baul('colaborador')] });
    vi.mocked(updatePersonaBiografia).mockResolvedValue(undefined);

    render(<PersonaBiografiaTabContainer baulId={baulId} persona={persona({ biografia: 'Texto original' })} />);
    await user.click(screen.getByRole('button', { name: /editar biografía/i }));
    const textarea = screen.getByDisplayValue('Texto original');
    await user.clear(textarea);
    await user.type(textarea, 'Texto nuevo');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(updatePersonaBiografia).toHaveBeenCalledWith(baulId, 'p1', 'Texto nuevo');
    await waitFor(() => expect(screen.queryByDisplayValue('Texto nuevo')).not.toBeInTheDocument());
  });
});
