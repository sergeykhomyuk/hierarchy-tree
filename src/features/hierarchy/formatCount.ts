// Every number the user sees formats through Intl rather than raw string
// interpolation (invariant 156) - a caller passes i18n.language so the
// grouping and digit shape follow whatever locale is active, not a
// hardcoded one.
export function formatCount(value: number, language: string): string {
  return new Intl.NumberFormat(language).format(value);
}
