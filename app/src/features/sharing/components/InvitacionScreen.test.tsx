// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitacionScreen } from './InvitacionScreen';

describe('InvitacionScreen', () => {
  it('greets by persona nickname for a personal invitation', () => {
    render(
      <InvitacionScreen
        baulNombre="Familia Pérez"
        personaNickname="Abuela"
        previewPhotos={[]}
        onUnirme={vi.fn()}
        onVerMas={vi.fn()}
      />
    );

    expect(screen.getByText('Abuela, te han invitado a un Baúl privado para guardar recuerdos')).toBeInTheDocument();
  });

  it('falls back to a generic greeting when there is no persona to name (global invite link)', () => {
    render(
      <InvitacionScreen
        baulNombre="Familia Pérez"
        previewPhotos={[]}
        onUnirme={vi.fn()}
        onVerMas={vi.fn()}
      />
    );

    expect(screen.getByText('Te han invitado a un Baúl privado para guardar recuerdos')).toBeInTheDocument();
  });

  it('fires onUnirme and onVerMas from their respective CTAs', async () => {
    const user = userEvent.setup();
    const onUnirme = vi.fn();
    const onVerMas = vi.fn();

    render(
      <InvitacionScreen
        baulNombre="Familia Pérez"
        previewPhotos={[]}
        onUnirme={onUnirme}
        onVerMas={onVerMas}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Unirme al Baúl' }));
    await user.click(screen.getByRole('button', { name: 'Ver de qué va esto' }));

    expect(onUnirme).toHaveBeenCalledTimes(1);
    expect(onVerMas).toHaveBeenCalledTimes(1);
  });
});
