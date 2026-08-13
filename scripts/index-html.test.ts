import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf-8');

describe('index.html', () => {
  it('declares the document language as en', () => {
    expect(html).toMatch(/<html[^>]*\blang="en"/);
  });

  it('carries a responsive viewport meta tag', () => {
    expect(html).toMatch(
      /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1\.0"/,
    );
  });

  it('carries a title', () => {
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });

  it('the favicon link resolves to a file that is not the Vite logo', () => {
    const match = html.match(/<link rel="icon"[^>]*href="([^"]+)"/);
    expect(match, 'expected an icon link').not.toBeNull();

    const href = match?.[1] ?? '';
    expect(href).not.toContain('vite.svg');
  });
});
