import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  it('sets document.title to the given value', () => {
    renderHook(() => useDocumentTitle('Kit label'));

    expect(document.title).toBe('Kit label');
  });

  it('updates document.title when the value changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'First title' },
    });
    expect(document.title).toBe('First title');

    rerender({ title: 'Second title' });

    expect(document.title).toBe('Second title');
  });
});
