import { Locale } from './locale';

// i18next types a language as a plain string, so indexing a Locale-keyed
// Record with one needs a real narrowing step - TypeScript won't narrow a
// bare string via `===`/`in` down to a Record's literal key type, and a
// cast would silence a mismatch it can't actually verify.
export function isNonTestLocale(
  value: string,
): value is Exclude<Locale, typeof Locale.Test> {
  return value !== Locale.Test;
}
