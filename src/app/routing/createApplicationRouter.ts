import { createBrowserRouter, type DataRouter } from 'react-router';
import type { Runtime } from '../composition';
import { routeDefinitions } from './routeDefinitions';

// react-router's public entry exports the <Router> COMPONENT as the value
// `Router`, which shadows the data-router instance type of the same name
// in lib/router/router.d.ts - that type is re-exported under `DataRouter`
// instead (confirmed against the installed react-router@8.3.0's index.d.ts).
export function createApplicationRouter(runtime: Runtime): DataRouter {
  return createBrowserRouter(routeDefinitions(runtime.i18n), {
    basename: runtime.configuration.basePath,
  });
}
