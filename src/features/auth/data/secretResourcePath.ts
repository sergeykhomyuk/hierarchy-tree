import type { ResourcePath } from '@platform/http';
import type { DerivedSecret } from '../domain/derivedSecret';

export function secretResourcePath(secret: DerivedSecret): ResourcePath {
  return `/secrets/${secret}.json`;
}
