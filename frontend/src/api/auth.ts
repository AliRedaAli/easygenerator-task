export interface AuthUser {
  name: string;
  email: string;
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(message || `Request failed with status ${res.status}`);
  }
  return data;
}

export function signup(name: string, email: string, password: string): Promise<AuthUser> {
  return fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  }).then(parseJson);
}

export function login(email: string, password: string): Promise<AuthUser> {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  }).then(parseJson);
}

export function logout(): Promise<void> {
  return apiFetch('/api/auth/logout', { method: 'POST' }).then(() => undefined);
}

export function me(): Promise<AuthUser> {
  return apiFetch('/api/auth/me');
}

function refresh(): Promise<Response> {
  return fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
}

/**
 * Authenticated fetch: on a 401 (expired 15m access token) it silently calls
 * /auth/refresh once and retries, so the caller never has to think about
 * token expiry. If refresh also 401s, the failure propagates as "logged out".
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const doFetch = () => fetch(path, { ...options, credentials: 'include' });
  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refresh();
    if (refreshed.ok) {
      res = await doFetch();
    }
  }
  return parseJson(res);
}
