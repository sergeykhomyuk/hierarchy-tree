import { memo } from 'react';
import { ErrorState } from '@shared/ui';
import commonCatalogue from './locales/en/common.json';

type ConfigurationErrorScreenProps = {
  invalidKeys: readonly string[];
};

// Rendered before createRuntime.ts can build an i18next instance -
// configuration is invalid by definition here, and internationalization
// needs validated configuration (section 3.1). The strings still come
// from the i18next catalogue (invariant 60): common.json is imported
// directly as the static JSON it is, read as plain object properties
// rather than through useTranslation()'s live instance.
const ConfigurationErrorScreen = memo(function ConfigurationErrorScreen({
  invalidKeys,
}: ConfigurationErrorScreenProps) {
  return (
    <main>
      <ErrorState
        title={commonCatalogue.configurationError.title}
        message={`${commonCatalogue.configurationError.message} ${invalidKeys.join(', ')}`}
      />
    </main>
  );
});

export { ConfigurationErrorScreen };
export type { ConfigurationErrorScreenProps };
