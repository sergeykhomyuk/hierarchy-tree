import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFetchTransport } from './createFetchTransport';

describe('createFetchTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the global fetch with the given request and returns its response', async () => {
    const fakeResponse = new Response('{}', { status: 200 });
    const fetchSpy = vi.fn().mockResolvedValue(fakeResponse);
    vi.stubGlobal('fetch', fetchSpy);

    const transport = createFetchTransport();
    const request = new Request('https://api.example.com/things');
    const response = await transport(request);

    expect(fetchSpy).toHaveBeenCalledWith(request);
    expect(response).toBe(fakeResponse);
  });
});
