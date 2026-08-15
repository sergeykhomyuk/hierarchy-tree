import { memo, useCallback, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { HttpClient } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { Button, Card, Field, FieldContext, Input } from '@shared/ui';
import type { FieldContextValue } from '@shared/ui';
import { useDocumentTitle } from '@shared/hooks';
import { LoginAlert } from './LoginAlert';
import { loginCardState } from './loginCardState';
import { ProductMark } from './ProductMark';
import { useLoginSubmission } from './useLoginSubmission';

const ALERT_ID = 'login-alert';

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
  const noMatch = cardState.kind === 'noMatch';
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  // Retrying unmounts the alert holding the focused retry control - which
  // would otherwise drop focus to document.body (invariant 110). Moving
  // focus here, inside the same click handler that starts the retry's
  // dispatch, relocates it to the still-mounted (busy) Login control
  // before react ever removes the retry button from the DOM.
  const handleRetry = useCallback(() => {
    loginButtonRef.current?.focus();
  }, []);

  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value),
    [],
  );
  const handlePasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value),
    [],
  );

  // No field-level message in the no-match state (invariants 51, 52,
  // 109): both fields are marked invalid and described by the one
  // card-level alert instead - the derivation collapses email and
  // password into a single secret, so no per-field attribution is
  // possible. The provider always wraps the input (only its value
  // changes) rather than being conditionally present, so react never
  // swaps the element type at this position and remounts the input -
  // which would silently drop focus if it ever held it.
  const fieldContextValue: FieldContextValue = noMatch
    ? { invalid: true, required: true, describedBy: ALERT_ID }
    : { invalid: false, required: true };

  return (
    <Card>
      <form action={formAction} onSubmit={onSubmit}>
        <ProductMark />
        <h1>{t('login.heading')}</h1>
        <p>{t('login.subtext')}</p>
        {noMatch && (
          <LoginAlert
            id={ALERT_ID}
            kind="noMatch"
            message={t('login.noMatchMessage')}
          />
        )}
        {cardState.kind === 'serviceProblem' && (
          <LoginAlert
            id={ALERT_ID}
            kind="serviceProblem"
            message={t('login.serviceProblemMessage')}
            correlationId={cardState.correlationId}
            correlationLabel={t('login.serviceProblemCorrelationLabel')}
            retryLabel={t('login.retry')}
            onRetry={handleRetry}
          />
        )}
        <Field id="login-email" label={t('login.emailLabel')} required>
          <FieldContext.Provider value={fieldContextValue}>
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
          </FieldContext.Provider>
        </Field>
        <Field id="login-password" label={t('login.passwordLabel')} required>
          <FieldContext.Provider value={fieldContextValue}>
            <Input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              readOnly={submitting}
            />
          </FieldContext.Provider>
        </Field>
        <Button
          ref={loginButtonRef}
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
