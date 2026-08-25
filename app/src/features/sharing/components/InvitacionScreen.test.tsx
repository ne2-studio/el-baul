// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitacionScreen } from './InvitacionScreen';

describe('InvitacionScreen', () => {
  it('shows a generic greeting for the global invite link', () => {
    render(
      <InvitacionScreen
        baulNombre="Familia Pérez"
        previewPhotos={[]}
        onContinuar={vi.fn()}
      />
    );

    expect(screen.getByText('Te han invitado a un Baúl privado para guardar recuerdos')).toBeInTheDocument();
  });

  it('fires onContinuar from its single CTA and exposes no other way to skip onboarding', async () => {
    const user = userEvent.setup();
    const onContinuar = vi.fn();

    render(
      <InvitacionScreen
        baulNombre="Familia Pérez"
        previewPhotos={[]}
        onContinuar={onContinuar}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Unirme al Baúl' }));

    expect(onContinuar).toHaveBeenCalledTimes(1);
  });
});
