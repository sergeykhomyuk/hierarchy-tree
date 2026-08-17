import { memo, useCallback } from 'react';
import type { MouseEvent, ReactNode, Ref } from 'react';

type ButtonProps = {
  variant: 'primary' | 'secondary';
  type?: 'button' | 'submit';
  disabled?: boolean;
  busy?: boolean;
  fullWidth?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

// hover:bg-primary-pressed only paints the pressed fill on a hovered
// pointer, so an un-hovered busy button would otherwise show the
// un-pressed variant. A separate busy class (rather than combining
// bg-primary with a plain bg-primary-pressed alongside it) avoids two
// same-specificity background utilities whose winner would depend on
// Tailwind's generated stylesheet order rather than the props.
const VARIANT_CLASS: Record<
  'primary' | 'secondary',
  { default: string; busy: string }
> = {
  primary: {
    default: 'bg-primary text-on-primary hover:bg-primary-pressed',
    busy: 'bg-primary-pressed text-on-primary',
  },
  secondary: {
    default:
      'border border-border-control bg-surface text-ink hover:bg-surface-hover',
    busy: 'border border-border-control bg-surface-hover text-ink',
  },
};

export const Button = memo(function Button({
  variant,
  type = 'button',
  disabled,
  busy,
  fullWidth,
  onClick,
  children,
  ref,
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
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={busy ? 'true' : undefined}
      aria-disabled={busy ? 'true' : undefined}
      onClick={handleClick}
      className={[
        'duration-fast rounded-control px-4 py-2 font-medium transition-colors ease-standard disabled:opacity-50',
        fullWidth && 'w-full',
        busy ? VARIANT_CLASS[variant].busy : VARIANT_CLASS[variant].default,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {busy && (
        <span
          aria-hidden="true"
          className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]"
        />
      )}
      {children}
    </button>
  );
});
