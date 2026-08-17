import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@shared/ui';
import { clearSession } from '@features/auth';
import type { SignedInUserView } from '@features/auth';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { SignedInName } from './SignedInName';

export type SignedInHeaderDependencies = {
  observability: ObservabilityFacade;
  tabStorage: KeyValueStorage;
  beginInteraction: () => string;
  navigate: (destination: string, options: { replace: boolean }) => void;
};

type SignedInHeaderProps = {
  signedInUser: Promise<SignedInUserView | null>;
  dependencies: SignedInHeaderDependencies;
};

// Rendered only inside AuthenticatedLayout, so it never reaches the
// login or not-found routes (invariant 95) by construction rather than
// by a condition here. The logout control sits outside SignedInName's
// Suspense boundary, so it exists and is operable before any name is
// known and if one never arrives (invariant 98).
export const SignedInHeader = memo(function SignedInHeader({
  signedInUser,
  dependencies,
}: SignedInHeaderProps) {
  const { t } = useTranslation();

  const handleLogout = useCallback(() => {
    const correlationId = dependencies.beginInteraction();
    clearSession(dependencies.tabStorage);
    dependencies.observability.analytics.track('auth.signed_out', {
      correlationId,
    });
    dependencies.navigate('/login', { replace: true });
  }, [dependencies]);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border-hairline px-6 py-4">
      <div>
        <p className="text-sm text-ink-muted">{t('header.eyebrow')}</p>
        <p className="text-lg font-semibold text-ink">
          {t('header.pageTitle')}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <SignedInName signedInUser={signedInUser} />
        <Button variant="secondary" onClick={handleLogout}>
          {t('header.logout')}
        </Button>
      </div>
    </header>
  );
});
