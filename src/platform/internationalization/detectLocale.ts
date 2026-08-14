import { Locale } from './locale';

export function detectLocale(candidates: readonly string[]): Locale {
  for (const candidate of candidates) {
    const subtag = candidate.split('-')[0]?.toLowerCase();
    const match = Object.values(Locale).find((locale) => locale === subtag);
    if (match !== undefined) return match;
  }
  return Locale.English;
}
