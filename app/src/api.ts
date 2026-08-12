export {
  API_BASE,
  API_CONNECTIVITY_LOST_EVENT,
  API_FORBIDDEN_EVENT,
  API_UNAUTHORIZED_EVENT,
  ApiConnectionError,
  ApiError,
  isApiErrorWithStatus,
  isApiConnectionError,
  isForbiddenError,
  isUnauthorizedError,
  setAccessToken,
} from './api/http';
export type { AvatarCrop } from './api/publicTypes';

import { appConfigApi } from './api/resources/appConfig';
import { baulInvitesApi } from './api/resources/baulInvites';
import { baulesApi } from './api/resources/baules';
import { chaptersApi } from './api/resources/chapters';
import { chatApi } from './api/resources/chat';
import { photoBatchesApi } from './api/resources/photoBatches';
import { photosApi } from './api/resources/photos';
import { pushNotificationsApi, usersApi } from './api/resources/users';
import { recuerdosApi } from './api/resources/recuerdos';
import { sharedLinksApi } from './api/resources/sharedLinks';
import { supportApi } from './api/resources/support';

export const api = {
  baules: baulesApi,
  chapters: chaptersApi,
  photos: photosApi,
  photoBatches: photoBatchesApi,
  recuerdos: recuerdosApi,
  sharedLinks: sharedLinksApi,
  baulInvites: baulInvitesApi,
  users: usersApi,
  pushNotifications: pushNotificationsApi,
  appConfig: appConfigApi,
  support: supportApi,
  chat: chatApi,
};
