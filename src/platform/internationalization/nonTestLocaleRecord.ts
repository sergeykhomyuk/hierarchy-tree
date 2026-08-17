import type { Locale } from './locale';

// Locale.Test never has an entry of its own - resolveByLocale always
// derives it from Locale.English - so it is excluded from the key set
// here rather than left as an entry nothing would ever populate.
export type NonTestLocaleRecord<TValue> = Record<
  Exclude<Locale, typeof Locale.Test>,
  TValue
>;
