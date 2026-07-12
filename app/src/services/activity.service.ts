import { API_BASE, getAuthHeaders } from './base';

export async function getActivities(accessToken: string) {
  const response = await fetch(`${API_BASE}/activities`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get activities');
  }
  
  const data = await response.json();
  return data.activities;
}
