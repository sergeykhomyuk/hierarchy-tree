import { memo, useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { localeDirection } from '@platform/internationalization';
import { RootErrorBoundary } from './error-boundary/RootErrorBoundary';
import { RuntimeContext } from './composition/runtimeContext';
import type { Runtime } from './composition/createRuntime';

type ApplicationRootProps = {
  runtime: Runtime;
  children: ReactNode;
};

// The provider stack in exactly one place (invariant 90). The router is
// not composed in here - it is supplied as `children` by the caller
// (bootstrap.ts in production, a test-built element in tests), which is
// what lets a test render an arbitrary "route" through this exact stack
// without a real router.
export const ApplicationRoot = memo(function ApplicationRoot({
  runtime,
  children,
}: ApplicationRootProps) {
  const language = runtime.i18n.language;

  // The single place `lang`/`dir` are derived from the active locale
  // (invariants 65, 66, 68), rather than the hardcoded `lang="en"` in
  // index.html that only covers the pre-hydration flash.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = localeDirection(language);
  }, [language]);

  return (
    <RuntimeContext.Provider value={runtime}>
      <I18nextProvider i18n={runtime.i18n}>
        <RootErrorBoundary runtime={runtime}>{children}</RootErrorBoundary>
      </I18nextProvider>
    </RuntimeContext.Provider>
  );
});
