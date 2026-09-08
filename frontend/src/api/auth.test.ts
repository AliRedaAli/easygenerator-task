import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './auth';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('retries once via /auth/refresh after a 401 and returns the retried response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // original request
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // /auth/refresh
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'Ada', email: 'ada@example.com' }))); // retried request
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch('/api/auth/me');

    expect(result).toEqual({ name: 'Ada', email: 'ada@example.com' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh');
  });

  it('propagates the failure when refresh also 401s', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // original request
      .mockResolvedValueOnce(new Response(null, { status: 401 })); // /auth/refresh also fails
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/auth/me')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
