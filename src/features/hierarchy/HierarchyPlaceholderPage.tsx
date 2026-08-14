import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@shared/ui';
import { useDocumentTitle } from '@shared/hooks';

const HierarchyPlaceholderPage = memo(function HierarchyPlaceholderPage() {
  const { t } = useTranslation('hierarchy');
  useDocumentTitle(t('home.documentTitle'));

  return (
    <Card>
      <h1>{t('home.title')}</h1>
      <p>{t('home.message')}</p>
    </Card>
  );
});

export { HierarchyPlaceholderPage };
