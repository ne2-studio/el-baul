import { API_BASE, getAuthHeaders } from './base';

export async function getSharedUsers(accessToken: string, baulId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/shared-users`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get shared users');
  }
  
  const data = await response.json();
  return data.sharedUsers;
}

export async function shareBaul(accessToken: string, baulId: string, email: string, role: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/share`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ email, role })
  });
  
  if (!response.ok) {
    throw new Error('Failed to share baul');
  }
  
  const data = await response.json();
  return data.invitation;
}

export async function updateUserRole(accessToken: string, baulId: string, userId: string, role: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/shared-users/${userId}/role`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ role })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update role');
  }
  
  return response.json();
}

export async function revokeAccess(accessToken: string, baulId: string, userId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/shared-users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to revoke access');
  }
  
  return response.json();
}
