import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfigurationErrorScreen } from './ConfigurationErrorScreen';

describe('ConfigurationErrorScreen', () => {
  it('formats two or more invalid keys through Intl.ListFormat, not a hand-joined string', () => {
    render(
      <ConfigurationErrorScreen
        invalidKeys={['VITE_API_BASE_URL', 'VITE_REQUEST_TIMEOUT_MILLISECONDS']}
      />,
    );

    const expectedList = new Intl.ListFormat('en').format([
      'VITE_API_BASE_URL',
      'VITE_REQUEST_TIMEOUT_MILLISECONDS',
    ]);

    expect(screen.getByRole('alert').textContent).toContain(expectedList);
  });

  it('renders a single invalid key with no stray separator', () => {
    render(<ConfigurationErrorScreen invalidKeys={['VITE_API_BASE_URL']} />);

    expect(screen.getByRole('alert').textContent).toContain(
      'VITE_API_BASE_URL',
    );
  });
});
