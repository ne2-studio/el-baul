import { path, type PathTemplate } from '../contract';
import { del } from '../http';

const SHARED_LINK = '/api/shared-links/{token}' satisfies PathTemplate;

export const sharedLinksApi = {
  revoke: (token: string) => del<void>(path(SHARED_LINK, { token })),
};
