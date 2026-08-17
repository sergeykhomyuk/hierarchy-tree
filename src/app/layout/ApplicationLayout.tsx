import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

const MAIN_CONTENT_ID = 'main-content';

export const ApplicationLayout = memo(function ApplicationLayout() {
  const { t } = useTranslation();

  return (
    <>
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-ink"
      >
        {t('layout.skipLink')}
      </a>
      <main id={MAIN_CONTENT_ID}>
        <Outlet />
      </main>
    </>
  );
});
