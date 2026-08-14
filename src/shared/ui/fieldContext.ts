import { createContext } from 'react';

export type FieldContextValue = {
  describedBy?: string;
  invalid: boolean;
  required: boolean;
};

const DEFAULT_FIELD_CONTEXT_VALUE: FieldContextValue = {
  invalid: false,
  required: false,
};

export const FieldContext = createContext<FieldContextValue>(
  DEFAULT_FIELD_CONTEXT_VALUE,
);
