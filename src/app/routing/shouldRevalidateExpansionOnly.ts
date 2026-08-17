import type { ShouldRevalidateFunctionArgs } from 'react-router';

// The non-empty check is load-bearing: on router.revalidate() the two URLs
// are identical, so the difference set is empty, and
// differences.every(name => name === 'expanded') is vacuously TRUE for an
// empty array - which would return false and silently no-op every
// revalidation (Retry, Refresh and the bfcache guard included). Returning
// defaultShouldRevalidate for an empty difference set is what keeps those
// working.
export function shouldRevalidateExpansionOnly({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  const parameterNames = new Set([
    ...currentUrl.searchParams.keys(),
    ...nextUrl.searchParams.keys(),
  ]);

  const changedParameterNames = [...parameterNames].filter(
    (name) =>
      currentUrl.searchParams.get(name) !== nextUrl.searchParams.get(name),
  );

  const isExpansionOnly =
    changedParameterNames.length > 0 &&
    changedParameterNames.every((name) => name === 'expanded');

  return isExpansionOnly ? false : defaultShouldRevalidate;
}
