import { memo } from 'react';

type LoginAlertProps = {
  id: string;
  message: string;
};

// The card-level summary alert for both the no-match and service-problem
// states (invariants 51, 52, 109): no field-level message is ever
// rendered, so both fields point their aria-describedby at this one
// element instead.
export const LoginAlert = memo(function LoginAlert({
  id,
  message,
}: LoginAlertProps) {
  return (
    <div
      id={id}
      role="alert"
      className="rounded-card border border-border-hairline bg-danger-surface p-3 text-danger"
    >
      <p>{message}</p>
    </div>
  );
});
