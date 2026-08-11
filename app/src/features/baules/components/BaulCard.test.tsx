// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Baul } from '@/types';
import { BaulCard } from '@/features/baules/components/BaulCard';

function newBaul(overrides: Partial<Baul> = {}): Baul {
  return {
    id: 'b1',
    name: 'Familia García',
    chapterCount: 4,
    lastUpdated: 'hace 2 días',
    ...overrides,
  } as Baul;
}

describe('BaulCard', () => {
  it('calls onClick when the card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<BaulCard baul={newBaul()} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: /Familia García/ }));

    expect(onClick).toHaveBeenCalled();
  });

  it('shows the Custodio badge when the baúl counts as custodio for the plan', () => {
    render(<BaulCard baul={newBaul({ role: 'administrador', isCustodio: true })} onClick={vi.fn()} />);

    expect(screen.getByText('Custodio')).toBeInTheDocument();
  });

  it('shows the role name when the baúl does not count as custodio for the plan', () => {
    render(<BaulCard baul={newBaul({ role: 'colaborador' })} onClick={vi.fn()} />);

    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('shows the member count only when there is more than one member', () => {
    const { rerender } = render(<BaulCard baul={newBaul({ memberCount: 1 })} onClick={vi.fn()} />);
    expect(screen.queryByText(/miembros/)).not.toBeInTheDocument();

    rerender(<BaulCard baul={newBaul({ memberCount: 5 })} onClick={vi.fn()} />);
    expect(screen.getByText('5 miembros')).toBeInTheDocument();
  });

  it('falls back to a placeholder icon when there is no cover photo', () => {
    render(<BaulCard baul={newBaul({ coverPhotoUrl: undefined })} onClick={vi.fn()} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the cover photo when present', () => {
    render(<BaulCard baul={newBaul({ coverPhotoUrl: '/cover.jpg' })} onClick={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Familia García' })).toHaveAttribute('src', '/cover.jpg');
  });
});
