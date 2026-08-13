import {
  AdminBaul,
  AdminBaulDetail,
  AdminChatContextDebug,
  AdminSentEmail,
  AdminUser,
  AdminUserDetail,
  DashboardKpis,
} from './types';
import { getEnv } from './runtimeConfig';
import type { components } from './api/generated/schema';

type ApiSchemas = components['schemas'];
type AdminBaulDetailDto = ApiSchemas['AdminBaulDetailDto'];
type AdminBaulListItemDto = ApiSchemas['AdminBaulListItemDto'];
type AdminChatContextDebugDto = ApiSchemas['AdminChatContextDebugDto'];
type AdminDashboardResponse = ApiSchemas['AdminDashboardResponse'];
type AdminSentEmailDto = ApiSchemas['AdminSentEmailDto'];
type AdminUserDetailDto = ApiSchemas['AdminUserDetailDto'];
type AdminUserListItemDto = ApiSchemas['AdminUserListItemDto'];

const API_BASE_URL = getEnv('VITE_API_URL') || 'http://localhost:5050';

let _accessToken: string | undefined;

export function setAccessToken(token: string | undefined) {
  _accessToken = token;
}

const getHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${_accessToken}`,
});

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.error || error.message || `API Error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
};

export const api = {
  dashboard: {
    get: async (): Promise<DashboardKpis> =>
      fetch(`${API_BASE_URL}/api/admin/dashboard`, { headers: getHeaders() })
        .then((res) => handleResponse<AdminDashboardResponse>(res))
        .then((data) => new DashboardKpis(data)),
  },
  users: {
    getAll: async (): Promise<AdminUser[]> =>
      fetch(`${API_BASE_URL}/api/admin/users`, { headers: getHeaders() })
        .then((res) => handleResponse<AdminUserListItemDto[]>(res))
        .then((data) => data.map((u) => new AdminUser(u))),
    getById: async (id: string): Promise<AdminUserDetail> =>
      fetch(`${API_BASE_URL}/api/admin/users/${id}`, { headers: getHeaders() })
        .then((res) => handleResponse<AdminUserDetailDto>(res))
        .then((data) => new AdminUserDetail(data)),
    getEmails: async (id: string): Promise<AdminSentEmail[]> =>
      fetch(`${API_BASE_URL}/api/admin/users/${id}/emails`, { headers: getHeaders() })
        .then((res) => handleResponse<AdminSentEmailDto[]>(res))
        .then((data) => data.map((e) => new AdminSentEmail(e))),
    debugChatContext: async (userId: string, baulId: string, message: string): Promise<AdminChatContextDebug> =>
      fetch(`${API_BASE_URL}/api/admin/users/${userId}/baules/${baulId}/chat-context-debug`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message }),
      })
        .then((res) => handleResponse<AdminChatContextDebugDto>(res))
        .then((data) => new AdminChatContextDebug(data)),
  },
  baules: {
    getAll: async (): Promise<AdminBaul[]> =>
      fetch(`${API_BASE_URL}/api/admin/baules`, { headers: getHeaders() })
        .then((res) => handleResponse<AdminBaulListItemDto[]>(res))
        .then((data) => data.map((b) => new AdminBaul(b))),
    getById: async (id: string): Promise<AdminBaulDetail> =>
      fetch(`${API_BASE_URL}/api/admin/baules/${id}`, { headers: getHeaders() })
        .then((res) => handleResponse<AdminBaulDetailDto>(res))
        .then((data) => new AdminBaulDetail(data)),
    delete: async (id: string): Promise<void> =>
      fetch(`${API_BASE_URL}/api/admin/baules/${id}`, { method: 'DELETE', headers: getHeaders() }).then((res) =>
        handleResponse<void>(res)
      ),
    unlinkPersona: async (baulId: string, personaId: string): Promise<void> =>
      fetch(`${API_BASE_URL}/api/admin/baules/${baulId}/personas/${personaId}/unlink`, {
        method: 'POST',
        headers: getHeaders(),
      }).then((res) => handleResponse<void>(res)),
  },
  emails: {
    getAll: async (): Promise<AdminSentEmail[]> =>
      fetch(`${API_BASE_URL}/api/admin/emails`, { headers: getHeaders() })
        .then((res) => handleResponse<AdminSentEmailDto[]>(res))
        .then((data) => data.map((e) => new AdminSentEmail(e))),
    sendWelcomeTest: async (userId: string): Promise<void> =>
      fetch(`${API_BASE_URL}/api/admin/emails/welcome-test/${userId}`, { method: 'POST', headers: getHeaders() })
        .then((res) => handleResponse<void>(res)),
    sendDigestTest: async (userId: string): Promise<void> =>
      fetch(`${API_BASE_URL}/api/admin/emails/digest-test/${userId}`, { method: 'POST', headers: getHeaders() })
        .then((res) => handleResponse<void>(res)),
  },
  pushNotifications: {
    sendTest: async (userId: string, message: string, deepLink: string | null): Promise<void> =>
      fetch(`${API_BASE_URL}/api/admin/users/${userId}/push-notifications/test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, deepLink }),
      }).then((res) => handleResponse<void>(res)),
  },
};
