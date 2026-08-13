import { describe, expect, it } from 'vitest';
import { isNativeAppLinkUrl, isNativeOidcCallbackUrl } from './nativeOidcCallback';

describe('isNativeOidcCallbackUrl', () => {
  it('ignores a URL that does not use the native deep-link scheme', () => {
    expect(isNativeOidcCallbackUrl('https://el-baul.app/callback?code=abc')).toBe(false);
  });

  it('ignores a URL with a lookalike native deep-link scheme', () => {
    expect(isNativeOidcCallbackUrl('studio.ne2.elbaul.evil://callback?code=abc')).toBe(false);
  });

  it('ignores a malformed URL', () => {
    expect(isNativeOidcCallbackUrl('studio.ne2.elbaul')).toBe(false);
  });

  it('recognizes a successful sign-in callback (carries a code)', () => {
    expect(isNativeOidcCallbackUrl('studio.ne2.elbaul://callback?code=abc&state=xyz')).toBe(true);
  });

  it('recognizes a failed sign-in callback (carries an error)', () => {
    expect(isNativeOidcCallbackUrl('studio.ne2.elbaul://callback?error=access_denied')).toBe(true);
  });

  it('ignores a matching scheme with neither code nor error — the post-logout redirect', () => {
    expect(isNativeOidcCallbackUrl('studio.ne2.elbaul://callback')).toBe(false);
  });

  it('ignores a matching scheme with only unrelated params', () => {
    expect(isNativeOidcCallbackUrl('studio.ne2.elbaul://callback?state=xyz')).toBe(false);
  });
});

describe('isNativeAppLinkUrl', () => {
  it('recognizes an https App Link', () => {
    expect(isNativeAppLinkUrl('https://app-prod.el-baul.ne2.studio/?redirectTo=%2Fbaules')).toBe(true);
  });

  it('recognizes an http App Link', () => {
    expect(isNativeAppLinkUrl('http://localhost:3000/?redirectTo=%2Fbaules')).toBe(true);
  });

  it('ignores the native OIDC callback scheme', () => {
    expect(isNativeAppLinkUrl('studio.ne2.elbaul://callback?code=abc')).toBe(false);
  });

  it('ignores a malformed URL', () => {
    expect(isNativeAppLinkUrl('not a url')).toBe(false);
  });
});
