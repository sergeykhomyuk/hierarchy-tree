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

  // getAll() (via JSON.stringify for an unambiguous array comparison), not
  // get(): a repeated key's later occurrences would otherwise be invisible
  // to a comparison that only reads the first value.
  const changedParameterNames = [...parameterNames].filter(
    (name) =>
      JSON.stringify(currentUrl.searchParams.getAll(name)) !==
      JSON.stringify(nextUrl.searchParams.getAll(name)),
  );

  const isExpansionOnly =
    changedParameterNames.length > 0 &&
    changedParameterNames.every((name) => name === 'expanded');

  return isExpansionOnly ? false : defaultShouldRevalidate;
}
