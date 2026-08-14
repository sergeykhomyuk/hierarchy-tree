const RIGHT_TO_LEFT_LANGUAGE_SUBTAGS = new Set([
  'ar',
  'he',
  'fa',
  'ur',
  'ps',
  'sd',
  'yi',
]);

export function localeDirection(language: string): 'ltr' | 'rtl' {
  const subtag = language.split('-')[0]?.toLowerCase();
  return subtag !== undefined && RIGHT_TO_LEFT_LANGUAGE_SUBTAGS.has(subtag)
    ? 'rtl'
    : 'ltr';
}
