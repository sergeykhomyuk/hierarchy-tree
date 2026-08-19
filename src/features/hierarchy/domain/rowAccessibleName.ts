// The single computation TreeRow's aria-label and type-ahead matching
// both use (invariant 138: type-ahead "matches the same string a screen
// reader announces") - two independent implementations of this string
// could drift; this is the one place it is built.
export function rowAccessibleName(
  displayName: string,
  isSignedInUser: boolean,
  youMarkerLabel: string,
): string {
  return isSignedInUser ? `${displayName}, ${youMarkerLabel}` : displayName;
}
