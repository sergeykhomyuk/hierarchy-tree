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
const UNFRAMED_CLASS =
  'flex h-full flex-col items-center justify-center gap-[14px] p-10 text-center';

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
    <div role="alert" className={framed ? FRAME_CLASS : UNFRAMED_CLASS}>
      {glyph !== undefined && <div>{glyph}</div>}
      <h1
        className={
          framed
            ? 'font-semibold text-ink'
            : 'text-[17px] font-semibold text-ink'
        }
      >
        {title}
      </h1>
      <p
        className={
          framed
            ? 'text-ink-muted'
            : 'max-w-[40ch] text-[13.5px] leading-relaxed text-ink-muted-soft'
        }
      >
        {message}
      </p>
      {correlationId !== undefined && (
        <p
          className={
            framed
              ? 'text-ink-faint'
              : 'rounded-control bg-surface-hover px-2.5 py-1.5 font-mono text-xs text-ink-muted'
          }
        >
          {correlationId}
        </p>
      )}
      {(action !== undefined || secondaryAction !== undefined) && (
        <div className="flex gap-3">
          {action !== undefined && (
            <button
              type="button"
              onClick={action.onActivate}
              className={
                framed
                  ? 'rounded-control bg-primary px-4 py-2 text-on-primary'
                  : 'h-[38px] rounded-control bg-primary px-4 text-[13px] font-semibold text-on-primary'
              }
            >
              {action.label}
            </button>
          )}
          {secondaryAction !== undefined && (
            <button
              type="button"
              onClick={secondaryAction.onActivate}
              className={
                framed
                  ? 'rounded-control border border-border-hairline px-4 py-2 text-ink'
                  : 'h-[38px] rounded-control border border-border-control px-4 text-[13px] font-semibold text-ink'
              }
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
