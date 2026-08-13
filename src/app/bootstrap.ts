import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { StartupPlaceholder } from './StartupPlaceholder';

// The testable startup path: main.tsx is the one file whose name is not
// ours to choose (fixed by index.html's <script src>), so the actual
// startup logic lives here where a test can call it directly.
export function bootstrap(container: Element): void {
  createRoot(container).render(
    createElement(StrictMode, null, createElement(StartupPlaceholder)),
  );
}
