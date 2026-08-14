import type { Page } from '@playwright/test';

export type ConsoleRecord = {
  kind: 'console' | 'pageerror';
  text: string;
};

export function recordConsole(page: Page): { records: ConsoleRecord[] } {
  const records: ConsoleRecord[] = [];

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      records.push({ kind: 'console', text: message.text() });
    }
  });

  page.on('pageerror', (error) => {
    records.push({ kind: 'pageerror', text: error.message });
  });

  return { records };
}
