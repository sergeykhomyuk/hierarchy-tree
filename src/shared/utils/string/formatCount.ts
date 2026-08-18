// Formats through Intl rather than raw string interpolation, so grouping
// and digit shape follow the passed language rather than a hardcoded one.
export function formatCount(value: number, language: string): string {
  return new Intl.NumberFormat(language).format(value);
}
