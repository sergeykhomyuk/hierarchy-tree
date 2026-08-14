import { memo } from 'react';

type ErrorStateProps = {
  title: string;
  message: string;
  correlationId?: string;
  action?: { label: string; onActivate: () => void };
};

export const ErrorState = memo(function ErrorState({
  title,
  message,
  correlationId,
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-card border border-border-hairline bg-surface p-6"
    >
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-ink-muted">{message}</p>
      {correlationId !== undefined && (
        <p className="text-ink-faint">{correlationId}</p>
      )}
      {action !== undefined && (
        <button
          type="button"
          onClick={action.onActivate}
          className="rounded-control bg-primary px-4 py-2 text-on-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
});
