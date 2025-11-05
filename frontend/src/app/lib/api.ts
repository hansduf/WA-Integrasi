export function apiFetch(path: string, options: RequestInit = {}) {
  // Use the configured backend URL (can be ngrok for remote access)
  let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

  // Ensure single slash between base and path
  const base = backendUrl.replace(/\/$/, '');
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
    ...(options.headers || {}),
  } as Record<string, string>;

  const opts: RequestInit = {
    credentials: 'include', // Include cookies for authentication
    ...options,
    headers,
  };

  return fetch(url, opts).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`HTTP ${res.status}: ${text}`);
      (err as any).status = res.status;
      throw err;
    }
    try {
      const jsonResponse = await res.json();
      return jsonResponse;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON response from server');
    }
  }).catch((networkError) => {
    console.error('Network error:', networkError);
    throw new Error(`Network error: ${networkError.message}`);
  });
}

export default apiFetch;
