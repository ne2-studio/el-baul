import { describe, expect, it } from 'vitest';
import { hashInviteToken } from './inviteTokenHash';

describe('hashInviteToken', () => {
  it('is deterministic for the same token', async () => {
    expect(await hashInviteToken('abc123')).toBe(await hashInviteToken('abc123'));
  });

  it('differs for different tokens', async () => {
    expect(await hashInviteToken('abc123')).not.toBe(await hashInviteToken('abc124'));
  });

  it('returns a 16-char lowercase hex fingerprint, never the raw token', async () => {
    const hash = await hashInviteToken('some-secret-invite-token');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).not.toContain('secret');
  });
});
