import { memo } from 'react';
import { useTranslation } from 'react-i18next';

export const ProductMark = memo(function ProductMark() {
  const { t } = useTranslation('auth');

  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block h-8 w-8 rounded-control bg-primary"
      />
      <span className="font-semibold text-ink">{t('login.wordmark')}</span>
    </div>
  );
});
