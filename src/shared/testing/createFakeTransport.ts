import type { Transport } from '@platform/http';

type FakeTransportResponder = (
  request: Request,
) => Response | Promise<Response>;
type FakeTransportRoutes = Readonly<
  Record<string, FakeTransportResponder | readonly FakeTransportResponder[]>
>;

export function createFakeTransport(routes: FakeTransportRoutes): Transport {
  const queues = new Map<string, FakeTransportResponder[]>(
    Object.entries(routes).map(([key, responder]) => [
      key,
      Array.isArray(responder)
        ? [...(responder as readonly FakeTransportResponder[])]
        : [responder as FakeTransportResponder],
    ]),
  );

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const key = `${request.method} ${url.pathname}`;
    const queue = queues.get(key);
    const responder = queue?.shift();
    if (!responder) {
      throw new Error(`createFakeTransport: no queued response for "${key}"`);
    }
    return responder(request);
  };
}
