import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('base path', () => {
  it('every src and href in dist/index.html is root-relative', () => {
    const html = readFileSync('dist/index.html', 'utf-8');
    const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
      (match) => match[1] ?? '',
    );

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      if (url.startsWith('http') || url.startsWith('//')) continue;
      expect(url.startsWith('/'), `${url} is not root-relative`).toBe(true);
    }
  });

  it('no URL in dist carries a /hierarchy-tree/ prefix left over from the previous hosting', () => {
    const html = readFileSync('dist/index.html', 'utf-8');

    expect(html).not.toContain('/hierarchy-tree/');
  });

  it('vite.config.ts declares no base other than the default /', () => {
    const source = readFileSync('vite.config.ts', 'utf-8');
    const match = source.match(/(?<!\w)base:\s*(['"])([^'"]*)\1/);

    if (match) {
      expect(match[2]).toBe('/');
    }
  });
});
