import { API_BASE, getAuthHeaders } from './base';

export async function getBaules(accessToken: string) {
  console.log('📦 Fetching baules with token:', accessToken);
  
  const response = await fetch(`${API_BASE}/baules`, {
    headers: getAuthHeaders(accessToken)
  });
  
  console.log('📦 Baules response status:', response.status);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('📦 Baules error:', errorData);
    throw new Error(errorData.error || 'Failed to get baules');
  }
  
  const data = await response.json();
  console.log('📦 Baules data:', data);
  return data.baules;
}

export async function createBaul(accessToken: string, name: string, description: string) {
  const response = await fetch(`${API_BASE}/baules`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ name, description })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create baul');
  }
  
  const data = await response.json();
  return data.baul;
}

export async function getBaul(accessToken: string, baulId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get baul');
  }
  
  const data = await response.json();
  return data.baul;
}

export async function getBaulPreview(accessToken: string, baulId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/preview`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get baul preview');
  }
  
  const data = await response.json();
  return data.preview;
}

export async function acceptInvite(accessToken: string, baulId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/accept-invite`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error al aceptar la invitación' }));
    throw new Error(errorData.error || 'Failed to accept invite');
  }
  
  return await response.json();
}
