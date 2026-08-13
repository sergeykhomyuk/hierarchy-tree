import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

const MAIN_CONTENT_ID = 'main-content';

export function ApplicationLayout() {
  const { t } = useTranslation();

  return (
    <>
      <a href={`#${MAIN_CONTENT_ID}`}>{t('layout.skipLink')}</a>
      <main id={MAIN_CONTENT_ID}>
        <Outlet />
      </main>
    </>
  );
}
