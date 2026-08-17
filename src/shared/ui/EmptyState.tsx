import { memo } from 'react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  message: string;
  glyph?: ReactNode;
  action?: { label: string; onActivate: () => void };
  // Defaults to true. A page composing this inside its own Card sets it
  // false so the two frames don't nest.
  framed?: boolean;
};

const FRAME_CLASS = 'rounded-card border border-border-hairline bg-surface p-6';

export const EmptyState = memo(function EmptyState({
  title,
  message,
  glyph,
  action,
  framed = true,
}: EmptyStateProps) {
  return (
    <div className={framed ? FRAME_CLASS : undefined}>
      {glyph !== undefined && <div>{glyph}</div>}
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
