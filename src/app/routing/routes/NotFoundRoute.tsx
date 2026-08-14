import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export const NotFoundRoute = memo(function NotFoundRoute() {
  const { t } = useTranslation();

  return (
    <>
      <h1>{t('notFound.title')}</h1>
      <Link to="/">{t('notFound.linkHome')}</Link>
    </>
  );
});
