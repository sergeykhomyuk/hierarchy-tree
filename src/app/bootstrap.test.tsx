import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { bootstrap } from './bootstrap';

describe('bootstrap', () => {
  it('the startup placeholder renders through bootstrap', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      bootstrap(container);
    });

    expect(
      container.querySelector('[data-testid="startup-placeholder"]'),
    ).not.toBeNull();

    document.body.removeChild(container);
  });
});
