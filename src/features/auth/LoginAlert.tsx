import { memo } from 'react';
import { Button } from '@shared/ui';

type LoginAlertProps =
  | { id: string; kind: 'noMatch'; message: string }
  | {
      id: string;
      kind: 'serviceProblem';
      message: string;
      correlationId: string;
      correlationLabel: string;
      retryLabel: string;
      onRetry: () => void;
    };

// The card-level summary alert for both the no-match and service-problem
// states (invariants 51, 52, 109): no field-level message is ever
// rendered, so both fields point their aria-describedby at this one
// element instead. Retry sits inside the alert, ahead of both fields in
// document order (invariant 105).
export const LoginAlert = memo(function LoginAlert(props: LoginAlertProps) {
  return (
    <div
      id={props.id}
      role="alert"
      className="rounded-card border border-border-hairline bg-danger-surface p-3 text-danger"
    >
      <p>{props.message}</p>
      {props.kind === 'serviceProblem' && (
        <>
          <p>
            {props.correlationLabel}: {props.correlationId}
          </p>
          <Button variant="secondary" type="submit" onClick={props.onRetry}>
            {props.retryLabel}
          </Button>
        </>
      )}
    </div>
  );
});
