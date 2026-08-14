export const LogLevel = {
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
  Silent: 'silent',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
