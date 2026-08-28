// Short, stable fingerprint of an invite token, for analytics only. Lets us join a
// `family_invite_shared` event to the later `invite_viewed` / `invite_accepted` on the same
// link without ever sending the raw token — a bearer credential anyone could redeem — to
// PostHog. SHA-256, truncated to 64 bits: collision-safe at our invite volume and small
// enough to sit on every event. Never throws: if Web Crypto is unavailable the caller just
// captures the event without the hash.
export async function hashInviteToken(token: string): Promise<string | undefined> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  } catch {
    return undefined;
  }
}
