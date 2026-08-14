import type { Transport } from './transport';

export function createFetchTransport(): Transport {
  return (request) => fetch(request);
}
