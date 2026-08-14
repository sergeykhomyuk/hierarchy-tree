import { memo, useContext } from 'react';
import type { ChangeEvent } from 'react';
import { FieldContext } from './fieldContext';

type InputProps = {
  id: string;
  name: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
};

export const Input = memo(function Input({
  id,
  name,
  type,
  value,
  onChange,
  autoComplete,
}: InputProps) {
  const { describedBy, invalid, required } = useContext(FieldContext);

  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      required={required}
      className="rounded-control border border-border-field bg-surface px-3 py-2 text-ink placeholder:text-ink-placeholder"
    />
  );
});
