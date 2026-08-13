import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFoundRoute() {
  const { t } = useTranslation();

  return (
    <>
      <h1>{t('notFound.title')}</h1>
      <Link to="/">{t('notFound.linkHome')}</Link>
    </>
  );
}
