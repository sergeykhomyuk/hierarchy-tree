import type { HttpRequest } from './httpRequest';

export function buildUrl(
  apiBaseUrl: string,
  httpRequest: HttpRequest<unknown>,
): string {
  const url = new URL(httpRequest.resourcePath, apiBaseUrl);
  for (const [key, value] of Object.entries(
    httpRequest.searchParameters ?? {},
  )) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
