import { supabase, API_BASE, getAuthHeaders } from './base';

export async function signInWithGoogle(redirectTo?: string) {
  const options: any = {
    redirectTo: `${window.location.origin}/auth-loading`,
  };

  if (redirectTo) {
    options.redirectTo += `?redirectTo=${encodeURIComponent(redirectTo)}`;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options,
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getUserProfile(accessToken: string) {
  const response = await fetch(`${API_BASE}/auth/profile`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get profile');
  }
  
  return response.json();
}
