import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { bootstrap } from './bootstrap';

describe('bootstrap', () => {
  it('the startup placeholder renders through bootstrap', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      bootstrap(container);
    });

    expect(container.querySelector('h1')?.textContent).toBe('hierarchy-tree');

    document.body.removeChild(container);
  });
});
