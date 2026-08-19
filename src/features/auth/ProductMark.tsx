import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AUTH_TRANSLATION_NAMESPACE } from './translationNamespace';

export const ProductMark = memo(function ProductMark() {
  const { t } = useTranslation(AUTH_TRANSLATION_NAMESPACE);

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
