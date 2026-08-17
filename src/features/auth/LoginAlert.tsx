import { memo } from 'react';
import { Button } from '@shared/ui';
import { LoginCardStateKind } from './loginCardState';

type LoginAlertProps =
  | { id: string; kind: typeof LoginCardStateKind.NoMatch; message: string }
  | {
      id: string;
      kind: typeof LoginCardStateKind.ServiceProblem;
      message: string;
      correlationId: string;
      correlationLabel: string;
      retryLabel: string;
      retryDisabled: boolean;
      onRetry: () => void;
    };

// The card-level summary alert for both the no-match and service-problem
// states (invariants 51, 52, 109): no field-level message is ever
// rendered, so the no-match state's fields point their aria-describedby
// at this one element instead (the service-problem state isn't a field
// validation failure, so its fields carry no such association). Retry
// sits inside the alert, ahead of both fields in document order
// (invariant 105).
export const LoginAlert = memo(function LoginAlert(props: LoginAlertProps) {
  return (
    <div
      id={props.id}
      role="alert"
      className="rounded-card border border-border-hairline bg-danger-surface p-3 text-danger"
    >
      <p>{props.message}</p>
      {props.kind === LoginCardStateKind.ServiceProblem && (
        <>
          <p>
            {props.correlationLabel}: {props.correlationId}
          </p>
          <Button
            variant="secondary"
            type="submit"
            disabled={props.retryDisabled}
            onClick={props.onRetry}
          >
            {props.retryLabel}
          </Button>
        </>
      )}
    </div>
  );
});
