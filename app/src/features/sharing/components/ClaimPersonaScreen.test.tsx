// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimPersonaScreen } from './ClaimPersonaScreen';
import { ClaimablePersona } from '@/types';

const abuela = { id: '1', nickname: 'Abuela', name: 'María López' } as ClaimablePersona;
const tioJuan = { id: '2', nickname: 'Tío Juan' } as ClaimablePersona;

describe('ClaimPersonaScreen', () => {
  it('shows each claimable persona by nickname and name', () => {
    render(
      <ClaimPersonaScreen
        baulNombre="Familia García"
        personas={[abuela, tioJuan]}
        onSelectPersona={vi.fn()}
        onNotListed={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Abuela')).toBeInTheDocument();
    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.getByText('Tío Juan')).toBeInTheDocument();
  });

  it('fires onSelectPersona with the chosen persona when its row is clicked', async () => {
    const user = userEvent.setup();
    const onSelectPersona = vi.fn();

    render(
      <ClaimPersonaScreen
        baulNombre="Familia García"
        personas={[abuela, tioJuan]}
        onSelectPersona={onSelectPersona}
        onNotListed={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByText('Tío Juan'));

    expect(onSelectPersona).toHaveBeenCalledWith(tioJuan);
  });

  it('fires onNotListed from the "no soy ninguna" option', async () => {
    const user = userEvent.setup();
    const onNotListed = vi.fn();

    render(
      <ClaimPersonaScreen
        baulNombre="Familia García"
        personas={[abuela]}
        onSelectPersona={vi.fn()}
        onNotListed={onNotListed}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /No soy ninguna de las personas anteriores/ }));

    expect(onNotListed).toHaveBeenCalledTimes(1);
  });
});
