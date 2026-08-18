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
const UNFRAMED_CLASS =
  'flex h-full flex-col items-center justify-center gap-[14px] p-10 text-center';

export const EmptyState = memo(function EmptyState({
  title,
  message,
  glyph,
  action,
  framed = true,
}: EmptyStateProps) {
  return (
    <div className={framed ? FRAME_CLASS : UNFRAMED_CLASS}>
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
            : 'max-w-[38ch] text-[13.5px] leading-relaxed text-ink-muted-soft'
        }
      >
        {message}
      </p>
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
    </div>
  );
});
