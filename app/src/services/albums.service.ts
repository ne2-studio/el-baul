import { API_BASE, getAuthHeaders } from './base';

export async function getAlbums(accessToken: string, baulId: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/albums`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get albums');
  }
  
  const data = await response.json();
  return data.albums;
}

export async function createAlbum(accessToken: string, baulId: string, name: string, description: string) {
  const response = await fetch(`${API_BASE}/baules/${baulId}/albums`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ name, description })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create album');
  }
  
  const data = await response.json();
  return data.album;
}
