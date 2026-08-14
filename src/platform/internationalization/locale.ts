export const Locale = {
  English: 'en',
  Test: 'zxx',
} as const;

export type Locale = (typeof Locale)[keyof typeof Locale];
