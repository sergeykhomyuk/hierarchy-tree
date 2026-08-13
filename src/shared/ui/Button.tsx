import { memo, useCallback } from 'react';
import type { MouseEvent, ReactNode } from 'react';

type ButtonProps = {
  variant: 'primary' | 'secondary';
  type?: 'button' | 'submit';
  disabled?: boolean;
  busy?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
};

const VARIANT_CLASS: Record<'primary' | 'secondary', string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-pressed',
  secondary:
    'border border-border-control bg-surface text-ink hover:bg-surface-hover',
};

export const Button = memo(function Button({
  variant,
  type = 'button',
  disabled,
  busy,
  onClick,
  children,
}: ButtonProps) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (busy) {
        // Blocking means both halves: skip the caller's onClick AND stop
        // the native default action, which is what a type="submit"
        // button would otherwise still perform on this same event.
        event.preventDefault();
        return;
      }
      onClick?.(event);
    },
    [busy, onClick],
  );

  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={busy ? 'true' : undefined}
      aria-disabled={busy ? 'true' : undefined}
      onClick={handleClick}
      className={`duration-fast rounded-control px-4 py-2 font-medium transition-colors ease-standard disabled:opacity-50 ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </button>
  );
});
