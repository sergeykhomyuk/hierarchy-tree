import { memo, use } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@shared/ui';
import type { SignedInUserView } from '@features/auth';
import { SignedInAvatarPlaceholder } from './SignedInAvatarPlaceholder';

export type ResolvedSignedInNameProps = {
  signedInUser: Promise<SignedInUserView | null>;
};

// The Suspense-boundary consumer: use() suspends here, not in
// SignedInName, because a component can't render its own fallback -
// the boundary and the thing that suspends must be different components.
export const ResolvedSignedInName = memo(function ResolvedSignedInName({
  signedInUser,
}: ResolvedSignedInNameProps) {
  const { t } = useTranslation();
  const view = use(signedInUser);

  if (view === null) {
    return (
      <span className="flex items-center gap-2">
        <SignedInAvatarPlaceholder />
        <span>{t('header.signedInFallback')}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <Avatar displayName={view.displayName} size="medium" decorative />
      <span>{view.displayName}</span>
    </span>
  );
});
