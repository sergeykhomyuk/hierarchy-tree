const REDACTED_PLACEHOLDER = '[redacted]';
const REDACTED_KEY_PATTERN = /password|secret|token/i;
const CIRCULAR_PLACEHOLDER = '[circular]';

export function redact<Value>(value: Value): Value {
  return redactValue(value, new WeakSet()) as Value;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') {
    return redactResourcePathSegment(redactUrlSearchParameters(value));
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return CIRCULAR_PLACEHOLDER;
    seen.add(value);
    // Removed on the way back out: `seen` tracks the current recursion
    // PATH (ancestors), not every object visited so far - otherwise the
    // same object reachable twice via two sibling branches (a DAG, not a
    // cycle) would be wrongly flagged circular on its second occurrence.
    const result = value.map((item) => redactValue(item, seen));
    seen.delete(value);
    return result;
  }

  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) return CIRCULAR_PLACEHOLDER;
    seen.add(value);
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      result[key] = REDACTED_KEY_PATTERN.test(key)
        ? REDACTED_PLACEHOLDER
        : redactValue(source[key], seen);
    }
    seen.delete(value);
    return result;
  }

  return value;
}

// A resource path (e.g. '/secrets/<SECRET>.json') carries a secret as a
// path SEGMENT, which redactUrlSearchParameters does not touch - it only
// rewrites query parameters and only for a string that parses as an
// absolute URL. This scrubs the segment immediately following one that
// matches the redaction pattern, preserving any extension.
function redactResourcePathSegment(value: string): string {
  if (!value.startsWith('/')) return value;

  const segments = value.split('/');
  let redacted = false;
  for (let index = 1; index < segments.length; index += 1) {
    const previousSegment = segments[index - 1] ?? '';
    const segment = segments[index] ?? '';
    if (segment.length > 0 && REDACTED_KEY_PATTERN.test(previousSegment)) {
      const dotIndex = segment.lastIndexOf('.');
      const extension = dotIndex > 0 ? segment.slice(dotIndex) : '';
      segments[index] = `${REDACTED_PLACEHOLDER}${extension}`;
      redacted = true;
    }
  }

  return redacted ? segments.join('/') : value;
}

function redactUrlSearchParameters(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  let redacted = false;
  for (const key of [...url.searchParams.keys()]) {
    if (REDACTED_KEY_PATTERN.test(key)) {
      url.searchParams.set(key, REDACTED_PLACEHOLDER);
      redacted = true;
    }
  }

  return redacted ? url.toString() : value;
}
