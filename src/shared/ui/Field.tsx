import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import { FieldContext } from './fieldContext';

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export const Field = memo(function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldProps) {
  const hintId = hint !== undefined ? `${id}-hint` : undefined;
  const errorId = error !== undefined ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const contextValue = useMemo(
    () => ({
      invalid: error !== undefined,
      required: Boolean(required),
      ...(describedBy !== undefined ? { describedBy } : {}),
    }),
    [describedBy, error, required],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <FieldContext.Provider value={contextValue}>
        {children}
      </FieldContext.Provider>
      {hint !== undefined && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
