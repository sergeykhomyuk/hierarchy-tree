import { memo, Suspense } from 'react';
import type { SignedInUserView } from '@features/auth';
import { ResolvedSignedInName } from './ResolvedSignedInName';
import { SignedInNameSkeleton } from './SignedInNameSkeleton';

export type SignedInNameProps = {
  signedInUser: Promise<SignedInUserView | null>;
};

// Three presentations, all sharing the same reserved box (invariant 99):
// the skeleton while the loader's promise is pending, the resolved name
// and initials once it settles, and a static neutral placeholder when it
// settles to null. The promise arrives as a prop (not useLoaderData())
// so a component test can hand in each of its three shapes without a
// data router (section 1.2's navigate-as-dependency reasoning, applied
// here to the header).
export const SignedInName = memo(function SignedInName({
  signedInUser,
}: SignedInNameProps) {
  return (
    <Suspense fallback={<SignedInNameSkeleton />}>
      <ResolvedSignedInName signedInUser={signedInUser} />
    </Suspense>
  );
});
