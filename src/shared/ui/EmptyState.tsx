import { memo } from 'react';

type EmptyStateProps = {
  title: string;
  message: string;
  action?: { label: string; onActivate: () => void };
};

export const EmptyState = memo(function EmptyState({
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-card border border-border-hairline bg-surface p-6">
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-ink-muted">{message}</p>
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
