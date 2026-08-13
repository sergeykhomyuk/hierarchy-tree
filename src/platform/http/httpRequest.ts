import type { ResourcePath } from './resourcePath';

export type HttpRequest<Value> = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  resourcePath: ResourcePath;
  searchParameters?: Readonly<Record<string, string>>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMilliseconds?: number;
  parse: (payload: unknown) => Value;
};
