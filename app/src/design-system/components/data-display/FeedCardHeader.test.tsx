// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedCardHeader } from '@/design-system/components/data-display/FeedCardHeader';

describe('FeedCardHeader', () => {
  it('combines name and actionText into one line, with relative time on its own line below', () => {
    render(<FeedCardHeader name="Tita Loli" actionText="dejó un recuerdo" timestamp={new Date().toISOString()} />);

    expect(screen.getByText('Tita Loli')).toBeInTheDocument();
    expect(screen.getByText('dejó un recuerdo', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
  });

  it('opens the persona when the avatar is clicked and a handler is present', async () => {
    const user = userEvent.setup();
    const onAvatarClick = vi.fn();
    render(<FeedCardHeader name="Ana" actionText="subió 3 fotos" timestamp={new Date().toISOString()} onAvatarClick={onAvatarClick} />);

    const avatar = screen.getByRole('button', { name: 'Ver perfil de Ana' });
    expect(avatar).toBeEnabled();
    await user.click(avatar);

    expect(onAvatarClick).toHaveBeenCalledTimes(1);
  });

  it('disables the avatar when there is no onAvatarClick handler', () => {
    render(<FeedCardHeader name="Ana" actionText="subió 3 fotos" timestamp={new Date().toISOString()} />);

    expect(screen.getByRole('button', { name: 'Ver perfil de Ana' })).toBeDisabled();
  });

  it('renders the trailing slot', () => {
    render(
      <FeedCardHeader
        name="Ana"
        actionText="dejó un recuerdo"
        timestamp={new Date().toISOString()}
        trailing={<button type="button">Editar</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });
});
