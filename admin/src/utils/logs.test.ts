import { describe, expect, it } from 'vitest';
import { buildBaulLogsUrl, buildUserLogsUrl } from './logs';

describe('buildBaulLogsUrl', () => {
  it('builds a pre-filtered log feed link for a baúl id', () => {
    expect(buildBaulLogsUrl('79f0a8eb-78b3-4e80-9572-abd7e0c7f3ca')).toBe(
      "https://logs.ne2.studio/#/events?range=1d&signal=signal-99,signal-130&filter=BaulId%3D'79f0a8eb-78b3-4e80-9572-abd7e0c7f3ca'"
    );
  });
});

describe('buildUserLogsUrl', () => {
  it('builds a pre-filtered log feed link for a user id', () => {
    expect(buildUserLogsUrl('383112234844291842')).toBe(
      "https://logs.ne2.studio/#/events?range=1d&signal=signal-99,signal-130&filter=UserId%3D'383112234844291842'"
    );
  });
});
