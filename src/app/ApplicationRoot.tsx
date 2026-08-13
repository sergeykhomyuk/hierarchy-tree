import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
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
export function ApplicationRoot({ runtime, children }: ApplicationRootProps) {
  return (
    <RuntimeContext.Provider value={runtime}>
      <I18nextProvider i18n={runtime.i18n}>
        <RootErrorBoundary runtime={runtime}>{children}</RootErrorBoundary>
      </I18nextProvider>
    </RuntimeContext.Provider>
  );
}
