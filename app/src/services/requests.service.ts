import { API_BASE, getAuthHeaders } from './base';

// --- Access Requests ---

export async function getAccessRequests(accessToken: string, baulId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/access-requests`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get access requests');
  }
  
  const data = await response.json();
  return data.requests;
}

export async function submitAccessRequest(accessToken: string, baulId: string, message: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/access-requests`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ message })
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit access request');
  }
  
  const data = await response.json();
  return data.request;
}

export async function approveAccessRequest(accessToken: string, baulId: string, requestId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/access-requests/${requestId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to approve request');
  }
  
  return response.json();
}

export async function rejectAccessRequest(accessToken: string, baulId: string, requestId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/access-requests/${requestId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to reject request');
  }
  
  return response.json();
}

// --- Removal Requests ---

export async function getRemovalRequests(accessToken: string, baulId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/removal-requests`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get removal requests');
  }
  
  const data = await response.json();
  return data.requests;
}

export async function submitRemovalRequest(
  accessToken: string,
  baulId: string,
  photoId: string,
  photoUrl: string,
  photoCaption: string | undefined,
  reason: string
) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/removal-requests`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ photoId, photoUrl, photoCaption, reason })
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit removal request');
  }
  
  const data = await response.json();
  return data.request;
}

export async function approveRemovalRequest(accessToken: string, baulId: string, requestId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/removal-requests/${requestId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to approve removal request');
  }
  
  return response.json();
}

export async function rejectRemovalRequest(accessToken: string, baulId: string, requestId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/removal-requests/${requestId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to reject removal request');
  }
  
  return response.json();
}
