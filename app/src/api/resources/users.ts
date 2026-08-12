import { UserProfile } from '../../types';
import type { JsonRequest, JsonResponse, PathTemplate } from '../contract';
import { get, post, put } from '../http';

const USER_ME = '/api/users/me' satisfies PathTemplate;
const NOTIFICATION_PREFERENCES = '/api/users/me/notification-preferences' satisfies PathTemplate;
const ONBOARDING_SEEN = '/api/users/me/onboarding-seen' satisfies PathTemplate;
const PUSH_TOKENS = '/api/users/me/push-tokens' satisfies PathTemplate;
const UNREGISTER_PUSH_TOKEN = '/api/users/me/push-tokens/unregister' satisfies PathTemplate;

export const usersApi = {
  getProfile: async () => new UserProfile(await get<JsonResponse<typeof USER_ME, 'get'>>(USER_ME)),
  updateNotificationPreferences: async (weeklyDigestEnabled: boolean) =>
    new UserProfile(await put<JsonResponse<typeof NOTIFICATION_PREFERENCES, 'put'>>(
      NOTIFICATION_PREFERENCES,
      { weeklyDigestEnabled } satisfies JsonRequest<typeof NOTIFICATION_PREFERENCES, 'put'>
    )),
  markOnboardingSeen: async () => new UserProfile(await post<JsonResponse<typeof ONBOARDING_SEEN, 'post'>>(ONBOARDING_SEEN)),
};

export const pushNotificationsApi = {
  register: (token: string, platform: string) =>
    post<void>(PUSH_TOKENS, { token, platform } satisfies JsonRequest<typeof PUSH_TOKENS, 'post'>),
  unregister: (token: string) =>
    post<void>(UNREGISTER_PUSH_TOKEN, { token } satisfies JsonRequest<typeof UNREGISTER_PUSH_TOKEN, 'post'>),
};
