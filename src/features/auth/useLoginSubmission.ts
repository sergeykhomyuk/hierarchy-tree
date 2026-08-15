import { useActionState, useCallback, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import type { HttpClient } from '@platform/http';
import {
  SignInOutcome,
  type ObservabilityFacade,
} from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { deriveSecret } from './domain/deriveSecret';
import { lookupUserIdentifier } from './data/lookupUserIdentifier';
import type { LoginResult } from './loginCardState';
import { writeSession } from './session/writeSession';

export type UseLoginSubmissionDependencies = {
  http: HttpClient;
  observability: ObservabilityFacade;
  tabStorage: KeyValueStorage;
  beginInteraction: () => string;
  endInteraction: () => void;
  navigate: (destination: string, options: { replace: boolean }) => void;
};

export type UseLoginSubmissionResult = {
  result: LoginResult;
  isPending: boolean;
  formAction: (formData: FormData) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const UNTOUCHED: LoginResult = { outcome: 'untouched' };

// Wraps useActionState: the single in-flight guard is the form's own
// onSubmit calling preventDefault while pending, which stops React from
// ever queuing a second dispatch - a ref checked inside the action is a
// no-op, because a queued action runs only after the first resolves and
// clears the ref first (invariant 43).
export function useLoginSubmission(
  dependencies: UseLoginSubmissionDependencies,
  destination: string,
): UseLoginSubmissionResult {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const [result, dispatch, isPending] = useActionState<LoginResult, FormData>(
    async (previousResult, formData) => {
      const rawEmail = formData.get('email');
      const rawPassword = formData.get('password');
      const email = typeof rawEmail === 'string' ? rawEmail : '';
      const password = typeof rawPassword === 'string' ? rawPassword : '';
      const correlationId = dependencies.beginInteraction();
      dependencies.observability.analytics.track('auth.sign_in_started', {
        correlationId,
      });

      const controller = new AbortController();
      controllerRef.current = controller;

      const secret = deriveSecret(email, password);
      const outcome = await lookupUserIdentifier(
        dependencies.http,
        secret,
        correlationId,
        controller.signal,
      );
      controllerRef.current = null;

      if (outcome.kind === 'cancelled') {
        dependencies.endInteraction();
        return previousResult;
      }

      if (outcome.kind === 'signedIn') {
        writeSession(
          dependencies.tabStorage,
          dependencies.observability,
          outcome.userId,
        );
        dependencies.observability.analytics.track('auth.sign_in_settled', {
          correlationId,
          outcome: SignInOutcome.SignedIn,
        });
        dependencies.navigate(destination, { replace: true });
        return UNTOUCHED;
      }

      if (outcome.kind === 'noMatch') {
        dependencies.observability.logger.info('auth.sign_in_no_match', {
          correlationId,
        });
        dependencies.observability.analytics.track('auth.sign_in_settled', {
          correlationId,
          outcome: SignInOutcome.NoMatch,
        });
        dependencies.endInteraction();
        return { outcome: 'noMatch' };
      }

      dependencies.observability.logger.error('auth.sign_in_service_problem', {
        correlationId,
      });
      dependencies.observability.analytics.track('auth.sign_in_settled', {
        correlationId,
        outcome: SignInOutcome.ServiceProblem,
      });
      dependencies.endInteraction();
      return { outcome: 'serviceProblem', correlationId };
    },
    UNTOUCHED,
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (isPending) {
        event.preventDefault();
      }
    },
    [isPending],
  );

  return { result, isPending, formAction: dispatch, onSubmit };
}
