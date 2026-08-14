export const ObservabilitySink = {
  Console: 'console',
  Buffer: 'buffer',
  None: 'none',
} as const;

export type ObservabilitySink =
  (typeof ObservabilitySink)[keyof typeof ObservabilitySink];
