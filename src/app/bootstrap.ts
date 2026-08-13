import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { ConfigurationResult } from '@platform/configuration';
import { createObservability } from '@platform/observability';
import { createSystemRandomness } from '@platform/runtime';
import { ApplicationRoot } from './ApplicationRoot';
import { ConfigurationErrorScreen } from './ConfigurationErrorScreen';
import { StartupPlaceholder } from './StartupPlaceholder';
import { createRuntime } from './composition';
import { reportRootError } from './error-boundary';

// The testable startup path: main.tsx is the one file whose name is not
// ours to choose (fixed by index.html's <script src>), so the actual
// startup logic - including the configuration-failure branch (invariants
// 15, 16) - lives here where a test can call it directly.
export async function bootstrap(
  container: Element,
  configurationResult: ConfigurationResult,
): Promise<void> {
  if (!configurationResult.ok) {
    // A minimal, safe-defaults observability instance (console sink,
    // error level): the real one createRuntime.ts builds needs validated
    // configuration, which is unavailable here by definition. No router,
    // no feature code and no partially configured UI is mounted either way.
    const { facade } = createObservability({
      configuration: { observabilitySink: 'console', logLevel: 'error' },
      randomness: createSystemRandomness(),
    });
    facade.logger.error('app.configuration_invalid', {
      invalidKeys: configurationResult.invalidKeys,
    });
    createRoot(container).render(
      createElement(
        StrictMode,
        null,
        createElement(ConfigurationErrorScreen, {
          invalidKeys: configurationResult.invalidKeys,
        }),
      ),
    );
    return;
  }

  const runtime = await createRuntime(configurationResult.configuration);

  function handleBoundaryError(error: unknown): void {
    // React 19 logs every boundary-caught error via console.error by
    // default; routing it to reportRootError instead is what keeps the
    // console clean for invariant 100's e2e assertion, with the error
    // recorded in the buffer where that assertion actually looks.
    reportRootError(error, {
      observability: runtime.observability,
      interactionTracker: runtime.interactionTracker,
    });
  }

  createRoot(container, {
    onCaughtError: handleBoundaryError,
    onUncaughtError: handleBoundaryError,
  }).render(
    createElement(
      StrictMode,
      null,
      createElement(ApplicationRoot, {
        runtime,
        // The router becomes this element at step 31, once
        // build-output/expected-build-output.json's declaration table is
        // armed to expect the route chunks reaching it in the build would
        // produce (build-output/declaration-table.test.ts is fail-closed
        // on exactly that gap).
        children: createElement(StartupPlaceholder),
      }),
    ),
  );
}
