// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteFamilyModal } from './InviteFamilyModal';
import { BaulInviteLink } from '@/types';

const sharePublicLink = vi.fn();
vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: (...args: unknown[]) => sharePublicLink(...args),
}));

const link = new BaulInviteLink({
  token: 'abc123',
  url: 'https://app.el-baul.test/invitacion/baul/abc123',
  createdAt: new Date().toISOString(),
});

beforeEach(() => {
  sharePublicLink.mockReset();
});

describe('InviteFamilyModal', () => {
  it('fetches and displays the invite link on mount', async () => {
    const fetchLink = vi.fn().mockResolvedValue(link);

    render(
      <InviteFamilyModal baulName="Familia Pérez" fetchLink={fetchLink} onRegenerate={vi.fn()} onCancel={vi.fn()} onToast={vi.fn()} />
    );

    expect(fetchLink).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(link.url)).toBeInTheDocument();
  });

  it('copies the link to the clipboard', async () => {
    const user = userEvent.setup();
    // userEvent.setup() attaches its own clipboard stub (for its copy/paste APIs), replacing
    // navigator.clipboard.writeText — spy on it only after setup() runs, or this spy gets
    // clobbered by userEvent's own stub before the click ever happens.
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(
      <InviteFamilyModal baulName="Familia Pérez" fetchLink={() => Promise.resolve(link)} onRegenerate={vi.fn()} onCancel={vi.fn()} onToast={vi.fn()} />
    );
    await screen.findByText(link.url);

    await user.click(screen.getByRole('button', { name: 'Copiar' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(link.url);
  });

  it('shares the link via the shared sharePublicLink util', async () => {
    const user = userEvent.setup();
    render(
      <InviteFamilyModal baulName="Familia Pérez" fetchLink={() => Promise.resolve(link)} onRegenerate={vi.fn()} onCancel={vi.fn()} onToast={vi.fn()} />
    );
    await screen.findByText(link.url);

    await user.click(screen.getByRole('button', { name: 'Compartir' }));

    expect(sharePublicLink).toHaveBeenCalledWith(expect.objectContaining({ url: link.url }));
  });

  it('regenerates the link after confirmation and shows the new one', async () => {
    const user = userEvent.setup();
    const regenerated = new BaulInviteLink({
      token: 'xyz789',
      url: 'https://app.el-baul.test/invitacion/baul/xyz789',
      createdAt: new Date().toISOString(),
    });
    const onRegenerate = vi.fn().mockResolvedValue(regenerated);

    render(
      <InviteFamilyModal baulName="Familia Pérez" fetchLink={() => Promise.resolve(link)} onRegenerate={onRegenerate} onCancel={vi.fn()} onToast={vi.fn()} />
    );
    await screen.findByText(link.url);

    await user.click(screen.getByRole('button', { name: 'Regenerar enlace' }));
    // Confirmation sheet
    await user.click(await screen.findByRole('button', { name: 'Regenerar enlace' }));

    await waitFor(() => expect(onRegenerate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(regenerated.url)).toBeInTheDocument();
  });
});
