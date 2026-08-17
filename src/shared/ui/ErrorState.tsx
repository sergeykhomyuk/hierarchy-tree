import { memo } from 'react';
import type { ReactNode } from 'react';

type ErrorStateProps = {
  title: string;
  message: string;
  correlationId?: string;
  glyph?: ReactNode;
  action?: { label: string; onActivate: () => void };
  secondaryAction?: { label: string; onActivate: () => void };
  // Defaults to true. A page composing this inside its own Card sets it
  // false so the two frames don't nest.
  framed?: boolean;
};

const FRAME_CLASS = 'rounded-card border border-border-hairline bg-surface p-6';

export const ErrorState = memo(function ErrorState({
  title,
  message,
  correlationId,
  glyph,
  action,
  secondaryAction,
  framed = true,
}: ErrorStateProps) {
  return (
    <div role="alert" className={framed ? FRAME_CLASS : undefined}>
      {glyph !== undefined && <div>{glyph}</div>}
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-ink-muted">{message}</p>
      {correlationId !== undefined && (
        <p className="text-ink-faint">{correlationId}</p>
      )}
      {(action !== undefined || secondaryAction !== undefined) && (
        <div className="flex gap-3">
          {action !== undefined && (
            <button
              type="button"
              onClick={action.onActivate}
              className="rounded-control bg-primary px-4 py-2 text-on-primary"
            >
              {action.label}
            </button>
          )}
          {secondaryAction !== undefined && (
            <button
              type="button"
              onClick={secondaryAction.onActivate}
              className="rounded-control border border-border-hairline px-4 py-2 text-ink"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
