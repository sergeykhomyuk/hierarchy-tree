const REDACTED_PLACEHOLDER = '[redacted]';
const REDACTED_KEY_PATTERN = /password|secret|token/i;
const CIRCULAR_PLACEHOLDER = '[circular]';

export function redact<Value>(value: Value): Value {
  return redactValue(value, new WeakSet()) as Value;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') {
    return redactUrlSearchParameters(value);
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return CIRCULAR_PLACEHOLDER;
    seen.add(value);
    return value.map((item) => redactValue(item, seen));
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
    return result;
  }

  return value;
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
