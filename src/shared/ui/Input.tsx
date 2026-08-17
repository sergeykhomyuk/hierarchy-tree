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
  readOnly?: boolean;
  placeholder?: string;
};

export const Input = memo(function Input({
  id,
  name,
  type,
  value,
  onChange,
  autoComplete,
  readOnly,
  placeholder,
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
      readOnly={readOnly}
      placeholder={placeholder}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      required={required}
      className={`w-full rounded-control border bg-surface px-3 py-2 text-ink placeholder:text-ink-placeholder ${invalid ? 'border-danger' : 'border-border-field'}`}
    />
  );
});
