// The one place every route's absolute path is spelled out. app/routing,
// features/auth and features/hierarchy each independently redeclared
// '/login' (three constants plus one bare literal) before this existed -
// changing a route meant finding and updating all of them by hand. A
// route's registered path (react-router's routeDefinitions.ts) is always
// derivable from the absolute path here, never the other way around.
export const ROUTE_PATHS = {
  home: '/',
  login: '/login',
} as const;
