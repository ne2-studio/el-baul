import { AdminBaul, AdminBaulDetail, AdminSentEmail, AdminUser, AdminUserDetail, DashboardKpis } from './types';
import { getEnv } from './runtimeConfig';

const API_BASE_URL = getEnv('VITE_API_URL') || 'http://localhost:5050';

let _accessToken: string | undefined;

export function setAccessToken(token: string | undefined) {
  _accessToken = token;
}

const getHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${_accessToken}`,
});

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.error || error.message || `API Error: ${res.status}`);
  }
  if (res.status === 204) return undefined;
  return res.json();
};

export const api = {
  dashboard: {
    get: async (): Promise<DashboardKpis> =>
      fetch(`${API_BASE_URL}/api/admin/dashboard`, { headers: getHeaders() })
        .then(handleResponse)
        .then((data) => new DashboardKpis(data)),
  },
  users: {
    getAll: async (): Promise<AdminUser[]> =>
      fetch(`${API_BASE_URL}/api/admin/users`, { headers: getHeaders() })
        .then(handleResponse)
        .then((data) => data.map((u: any) => new AdminUser(u))),
    getById: async (id: string): Promise<AdminUserDetail> =>
      fetch(`${API_BASE_URL}/api/admin/users/${id}`, { headers: getHeaders() })
        .then(handleResponse)
        .then((data) => new AdminUserDetail(data)),
    getEmails: async (id: string): Promise<AdminSentEmail[]> =>
      fetch(`${API_BASE_URL}/api/admin/users/${id}/emails`, { headers: getHeaders() })
        .then(handleResponse)
        .then((data) => data.map((e: any) => new AdminSentEmail(e))),
  },
  baules: {
    getAll: async (): Promise<AdminBaul[]> =>
      fetch(`${API_BASE_URL}/api/admin/baules`, { headers: getHeaders() })
        .then(handleResponse)
        .then((data) => data.map((b: any) => new AdminBaul(b))),
    getById: async (id: string): Promise<AdminBaulDetail> =>
      fetch(`${API_BASE_URL}/api/admin/baules/${id}`, { headers: getHeaders() })
        .then(handleResponse)
        .then((data) => new AdminBaulDetail(data)),
  },
  emails: {
    getAll: async (): Promise<AdminSentEmail[]> =>
      fetch(`${API_BASE_URL}/api/admin/emails`, { headers: getHeaders() })
        .then(handleResponse)
        .then((data) => data.map((e: any) => new AdminSentEmail(e))),
    sendWelcomeTest: async (userId: string): Promise<void> =>
      fetch(`${API_BASE_URL}/api/admin/emails/welcome-test/${userId}`, { method: 'POST', headers: getHeaders() })
        .then(handleResponse),
    sendDigestTest: async (userId: string): Promise<void> =>
      fetch(`${API_BASE_URL}/api/admin/emails/digest-test/${userId}`, { method: 'POST', headers: getHeaders() })
        .then(handleResponse),
  },
};
