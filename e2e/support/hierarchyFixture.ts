import type { Page } from '@playwright/test';
import { deriveSecret } from '../../src/features/auth/domain/deriveSecret';
import type { ApiMockResponse } from './apiMocks';
import { installApiMocks } from './apiMocks';
import { SIGN_IN_EMAIL, SIGN_IN_PASSWORD } from './signIn';

const MATCHING_SECRET = deriveSecret(SIGN_IN_EMAIL, SIGN_IN_PASSWORD);

// The signed-in user IS the deepest person the fixture below produces -
// the row the responsive one-line assertions target already carries the
// you marker, rather than needing a second identity just to reach it.
export const DEEPEST_PERSON_ID = 7;
export const DEEPEST_PERSON_NAME = 'Persephone Okonkwo-Villanueva';

// Two roots, five managers, nine people, three levels deep at its
// deepest branch - a shape close to mockup 1e's own (10 people, 4
// managers, 2 roots) rather than a copy of it, with one branch pushed a
// level deeper so the responsive one-line assertions have a real third-
// level indent to measure, not just the mockup's second level.
export function populatedHierarchyPayload(): unknown {
  return [
    {
      id: 1,
      firstName: 'Ronnen',
      lastName: 'Gurevitch',
      email: 'ronnen.gurevitch@example.com',
    },
    {
      id: 2,
      firstName: 'Dorit',
      lastName: 'Nuhum',
      email: 'dorit.nuhum@example.com',
      managerId: 1,
    },
    {
      id: 3,
      firstName: 'Andrew',
      lastName: 'Crist',
      email: 'andrew.crist@example.com',
      managerId: 2,
    },
    {
      id: 4,
      firstName: 'Jed',
      lastName: 'Foster',
      email: 'jed.foster@example.com',
      managerId: 2,
    },
    {
      id: 5,
      firstName: 'Roni',
      lastName: 'Yashar',
      email: 'roni.yashar@example.com',
      managerId: 1,
    },
    {
      id: 6,
      firstName: 'Tal',
      lastName: 'Bergman',
      email: 'tal.bergman@example.com',
      managerId: 5,
    },
    {
      id: DEEPEST_PERSON_ID,
      firstName: 'Persephone',
      lastName: 'Okonkwo-Villanueva',
      email: 'persephone.okonkwo-villanueva@example.com',
      managerId: 6,
    },
    {
      id: 8,
      firstName: 'Noa',
      lastName: 'Shani',
      email: 'noa.shani@example.com',
    },
    {
      id: 9,
      firstName: 'Uri',
      lastName: 'Barak',
      email: 'uri.barak@example.com',
      managerId: 8,
    },
  ];
}

// Signs the DEEPEST person in - not the top of the tree - so a spec that
// expands down to that row also sees the you marker on it.
export async function installPopulatedHierarchyMock(page: Page): Promise<void> {
  await installHierarchyUserMock(page, {
    status: 200,
    body: populatedHierarchyPayload(),
  });
}

// A same-secret sign-in with a caller-chosen /users.json response - the
// empty-envelope screenshot reuses this with an empty array rather than
// standing up its own secret/session wiring.
export async function installHierarchyUserMock(
  page: Page,
  userResponse: ApiMockResponse,
): Promise<void> {
  await installApiMocks(page, {
    secret: (secret) => ({
      status: 200,
      body: secret === MATCHING_SECRET ? String(DEEPEST_PERSON_ID) : null,
    }),
    user: () => userResponse,
  });
}
