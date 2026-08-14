import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { Locale } from '@platform/internationalization';
import { renderRoute } from './testing/renderRoute';
import { useRuntime } from './composition/useRuntime';

function ProbeRoute() {
  const runtime = useRuntime();
  const { i18n } = useTranslation();

  return (
    <output>
      {runtime.configuration.apiBaseUrl}|
      {i18n.isInitialized ? 'ready' : 'not-ready'}
    </output>
  );
}

describe('ApplicationRoot', () => {
  it('a route rendered in a test goes through the real provider stack', async () => {
    await renderRoute(<ProbeRoute />);

    expect(screen.getByText('https://example.test|ready')).toBeInTheDocument();
  });

  it('sets document.documentElement.lang and dir from the active i18next language', async () => {
    await renderRoute(<ProbeRoute />);

    expect(document.documentElement.lang).toBe(Locale.Test);
    expect(document.documentElement.dir).toBe('ltr');
  });
});
