import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { ConfigurationResult } from '@platform/configuration';
import { createObservability } from '@platform/observability';
import { createSystemRandomness } from '@platform/runtime';
import { StartupPlaceholder } from './StartupPlaceholder';
import { ConfigurationErrorScreen } from './ConfigurationErrorScreen';

// The testable startup path: main.tsx is the one file whose name is not
// ours to choose (fixed by index.html's <script src>), so the actual
// startup logic - including the configuration-failure branch (invariants
// 15, 16) - lives here where a test can call it directly.
export function bootstrap(
  container: Element,
  configurationResult: ConfigurationResult,
): void {
  if (!configurationResult.ok) {
    // A minimal, safe-defaults observability instance (console sink,
    // error level) until createRuntime.ts (M5) builds the real one from
    // validated configuration - which is unavailable here by definition,
    // since configuration is exactly what failed. No router, no feature
    // code and no partially configured UI is mounted either way.
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

  createRoot(container).render(
    createElement(StrictMode, null, createElement(StartupPlaceholder)),
  );
}
