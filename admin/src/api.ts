import { AdminBaul, AdminBaulDetail, AdminUser, AdminUserDetail, DashboardKpis } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

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
};
