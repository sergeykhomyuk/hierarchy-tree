import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { RuntimeContext } from './composition/runtimeContext';
import type { Runtime } from './composition/createRuntime';

type ApplicationRootProps = {
  runtime: Runtime;
  children: ReactNode;
};

// The provider stack in exactly one place (invariant 90). RootErrorBoundary
// and RouterProvider join this composition in later steps, once
// error-boundary/ and routing/routeDefinitions.ts exist - both still wrap
// `children`, which is why the shape stays stable as they arrive.
export function ApplicationRoot({ runtime, children }: ApplicationRootProps) {
  return (
    <RuntimeContext.Provider value={runtime}>
      <I18nextProvider i18n={runtime.i18n}>{children}</I18nextProvider>
    </RuntimeContext.Provider>
  );
}
