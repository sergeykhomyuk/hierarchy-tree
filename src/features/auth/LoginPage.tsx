import { memo, useCallback, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { HttpClient } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { Button, Card, Field, Input } from '@shared/ui';
import { useDocumentTitle } from '@shared/hooks';
import { loginCardState } from './loginCardState';
import { ProductMark } from './ProductMark';
import { useLoginSubmission } from './useLoginSubmission';

export type LoginPageDependencies = {
  http: HttpClient;
  observability: ObservabilityFacade;
  tabStorage: KeyValueStorage;
  beginInteraction: () => string;
  navigate: (destination: string, options: { replace: boolean }) => void;
};

type LoginPageProps = {
  dependencies: LoginPageDependencies;
  destination: string;
};

export const LoginPage = memo(function LoginPage({
  dependencies,
  destination,
}: LoginPageProps) {
  const { t } = useTranslation('auth');
  useDocumentTitle(t('login.documentTitle'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { result, isPending, formAction, onSubmit } = useLoginSubmission(
    dependencies,
    destination,
  );

  const isReady = email.trim() !== '' && password !== '';
  const cardState = loginCardState(result, isPending, isReady);
  const submitting = cardState.kind === 'submitting';

  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value),
    [],
  );
  const handlePasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value),
    [],
  );

  return (
    <Card>
      <form action={formAction} onSubmit={onSubmit}>
        <ProductMark />
        <h1>{t('login.heading')}</h1>
        <p>{t('login.subtext')}</p>
        <Field id="login-email" label={t('login.emailLabel')} required>
          <Input
            id="login-email"
            name="email"
            type="text"
            value={email}
            onChange={handleEmailChange}
            placeholder={t('login.emailPlaceholder')}
            autoComplete="username"
            readOnly={submitting}
          />
        </Field>
        <Field id="login-password" label={t('login.passwordLabel')} required>
          <Input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            autoComplete="current-password"
            readOnly={submitting}
          />
        </Field>
        <Button
          variant="primary"
          type="submit"
          disabled={!isReady}
          busy={submitting}
        >
          {submitting ? t('login.submitting') : t('login.submit')}
        </Button>
        <p>{submitting ? t('login.footerNoteSubmitting') : t('login.footerNote')}</p>
      </form>
    </Card>
  );
});
