export function statusDescription(status: number): string {
  if (status >= 500) return 'server error';
  if (status >= 400) return 'client error';
  return 'error';
}
