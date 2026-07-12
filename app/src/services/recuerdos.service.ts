import { API_BASE, getAuthHeaders } from './base';

export async function getRecuerdos(accessToken: string, photoId: string) {
  const response = await fetch(`${API_BASE}/photos/${photoId}/recuerdos`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get recuerdos');
  }
  
  const data = await response.json();
  return data.recuerdos;
}

export async function createRecuerdo(accessToken: string, photoId: string, text: string) {
  const response = await fetch(`${API_BASE}/photos/${photoId}/recuerdos`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ text })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create recuerdo');
  }
  
  const data = await response.json();
  return data.recuerdo;
}
