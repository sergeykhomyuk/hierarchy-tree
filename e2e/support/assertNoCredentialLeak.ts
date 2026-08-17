import { expect } from '@playwright/test';

const WINDOW_LENGTH = 12;

// A small loop over the credential's own substrings, not a regex
// (TECH.md section 9). A literal "no substring at all" is unsatisfiable
// for any one-character value against any JSON document, so the pair of
// checks below - whole value, then every twelve-character window of it -
// is what invariants 76 and 125 actually settled on: strict enough to
// catch a truncated secret prefix, loose enough not to false-positive
// against ordinary JSON.
function twelveCharacterWindows(value: string): string[] {
  const windows: string[] = [];
  for (let start = 0; start + WINDOW_LENGTH <= value.length; start += 1) {
    windows.push(value.slice(start, start + WINDOW_LENGTH));
  }
  return windows;
}

// Asserts a candidate surface (telemetry buffer, storage, location.href,
// document.title, history.state, the serialised DOM) carries neither the
// typed email nor the typed password nor the derived secret, in full or
// as any twelve-character window of any of them (invariants 76, 125,
// 129, 131). Case-insensitive throughout - deriveSecret's output is
// uppercase hex, and a redaction or serialization step could otherwise
// change a value's case without changing what it reveals.
export function assertNoCredentialLeak(
  candidateText: string,
  credentials: { email: string; password: string; secret: string },
  surfaceName: string,
): void {
  const upperCandidate = candidateText.toUpperCase();
  for (const value of [
    credentials.email,
    credentials.password,
    credentials.secret,
  ]) {
    const upperValue = value.toUpperCase();
    expect(
      upperCandidate,
      `${surfaceName} contains a credential in full`,
    ).not.toContain(upperValue);
    for (const window of twelveCharacterWindows(upperValue)) {
      expect(
        upperCandidate,
        `${surfaceName} contains a twelve-character window of a credential: "${window}"`,
      ).not.toContain(window);
    }
  }
}
