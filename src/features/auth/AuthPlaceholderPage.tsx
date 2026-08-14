import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@shared/ui';
import { useDocumentTitle } from '@shared/hooks';

const AuthPlaceholderPage = memo(function AuthPlaceholderPage() {
  const { t } = useTranslation('auth');
  useDocumentTitle(t('login.documentTitle'));

  return (
    <Card>
      <h1>{t('login.title')}</h1>
      <p>{t('login.message')}</p>
    </Card>
  );
});

export { AuthPlaceholderPage };
