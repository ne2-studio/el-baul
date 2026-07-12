import { supabase, API_BASE, getAuthHeaders, SUPABASE_ANON_KEY } from './base';

export async function getPhotos(accessToken: string, albumId: string) {
  const response = await fetch(`${API_BASE}/albums/${albumId}/photos`, {
    headers: getAuthHeaders(accessToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to get photos');
  }
  
  const data = await response.json();
  return data.photos;
}

export async function uploadPhoto(
  accessToken: string,
  albumId: string,
  file: File,
  caption: string,
  date: string
) {
  // Check if we're using mock authentication
  const isMockAuth = accessToken.startsWith('mock-access-token');
  
  if (isMockAuth) {
    // Use server-side upload for mock users (bypasses RLS)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    
    const uploadResponse = await fetch(`${API_BASE}/photos/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'X-Mock-User-Id': 'mock-user-123'
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }));
      console.error('Upload error:', errorData);
      throw new Error(errorData.error || 'Failed to upload photo');
    }
    
    const { filePath, signedUrl } = await uploadResponse.json();
    
    // Create photo metadata
    const photoResponse = await fetch(`${API_BASE}/albums/${albumId}/photos`, {
      method: 'POST',
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify({
        caption,
        date,
        storageUrl: filePath
      })
    });
    
    if (!photoResponse.ok) {
      throw new Error('Failed to create photo');
    }
    
    const data = await photoResponse.json();
    return { ...data.photo, url: signedUrl };
  }
  
  // Real user flow - upload directly to Supabase Storage
  // First, get upload URL
  const urlResponse = await fetch(`${API_BASE}/photos/upload-url`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type
    })
  });
  
  if (!urlResponse.ok) {
    throw new Error('Failed to get upload URL');
  }
  
  const { filePath, bucketName } = await urlResponse.json();
  
  // Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);
  
  if (uploadError) {
    throw uploadError;
  }
  
  // Get signed URL
  const signedUrlResponse = await fetch(`${API_BASE}/photos/signed-url`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ filePath })
  });
  
  if (!signedUrlResponse.ok) {
    throw new Error('Failed to get signed URL');
  }
  
  const { signedUrl } = await signedUrlResponse.json();
  
  // Create photo metadata
  const photoResponse = await fetch(`${API_BASE}/albums/${albumId}/photos`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      caption,
      date,
      storageUrl: filePath
    })
  });
  
  if (!photoResponse.ok) {
    throw new Error('Failed to create photo');
  }
  
  const data = await photoResponse.json();
  return { ...data.photo, url: signedUrl };
}
