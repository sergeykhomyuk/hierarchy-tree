import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@shared/ui';

type ErrorSurfaceProps = {
  correlationId: string;
  onRecover: () => void;
};

// Recovery arrives as a prop rather than a router hook: RootErrorBoundary
// renders above RouterProvider, where useNavigate() throws.
export const ErrorSurface = memo(function ErrorSurface({
  correlationId,
  onRecover,
}: ErrorSurfaceProps) {
  const { t } = useTranslation();

  return (
    <ErrorState
      title={t('errorSurface.title')}
      message={t('errorSurface.message')}
      correlationId={correlationId}
      action={{ label: t('errorSurface.retry'), onActivate: onRecover }}
    />
  );
});
