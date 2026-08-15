import type { ResourcePath } from '@platform/http';

// There is no per-user path (see signedInUserSchema.ts's own note on why)
// - every lookup fetches this one, whole-collection path.
export const USERS_COLLECTION_RESOURCE_PATH: ResourcePath = '/users.json';
