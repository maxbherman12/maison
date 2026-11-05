'use client';

/**
 * Shared JSON fetch for the React Query hooks. A 401 means the session expired
 * or was revoked, so send the user to sign in instead of rendering a generic
 * "unable to load" state.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/sign-in?next=${encodeURIComponent(next)}`);
    }
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
