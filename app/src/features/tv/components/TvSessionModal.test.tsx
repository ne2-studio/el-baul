// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TvSessionModal } from './TvSessionModal';
import { TvSession } from '@/types';

const session = new TvSession({
  token: 'x7k9',
  url: 'https://app.el-baul.test/tv/x7k9',
  expiresAt: new Date().toISOString(),
});

describe('TvSessionModal', () => {
  it('creates a session on mount and shows the link', async () => {
    const onCreate = vi.fn().mockResolvedValue(session);

    render(<TvSessionModal onCreate={onCreate} onCancelSession={vi.fn()} onClose={vi.fn()} onToast={vi.fn()} />);

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('app.el-baul.test/tv/x7k9')).toBeInTheDocument();
  });

  it('closes without cancelling once acknowledged', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCancelSession = vi.fn();

    render(<TvSessionModal onCreate={() => Promise.resolve(session)} onCancelSession={onCancelSession} onClose={onClose} onToast={vi.fn()} />);
    await screen.findByText('app.el-baul.test/tv/x7k9');

    await user.click(screen.getByRole('button', { name: 'Ya está abierto en la TV' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancelSession).not.toHaveBeenCalled();
  });

  it('cancels the session and closes when Cancelar is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCancelSession = vi.fn().mockResolvedValue(undefined);

    render(<TvSessionModal onCreate={() => Promise.resolve(session)} onCancelSession={onCancelSession} onClose={onClose} onToast={vi.fn()} />);
    await screen.findByText('app.el-baul.test/tv/x7k9');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancelSession).toHaveBeenCalledWith('x7k9');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast when the session cannot be created', async () => {
    const onToast = vi.fn();

    render(<TvSessionModal onCreate={() => Promise.reject(new Error('boom'))} onCancelSession={vi.fn()} onClose={vi.fn()} onToast={onToast} />);

    await vi.waitFor(() => expect(onToast).toHaveBeenCalledWith('Error al iniciar el acceso a la TV', 'error'));
  });
});
