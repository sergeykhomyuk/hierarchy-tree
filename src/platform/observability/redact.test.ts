import { describe, expect, it } from 'vitest';
import { redact } from './redact';

describe('redact', () => {
  it('redaction removes matching keys at any depth including arrays cycles and url parameters', () => {
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic.self = cyclic;

    const payload = {
      password: 'topsecret',
      nested: {
        token: 'abc123',
        list: [{ secret: 'nested-secret' }, { safe: 'value' }],
      },
      SECRET_KEY: 'shouting-secret',
      callbackUrl: 'https://example.com/callback?token=leaked&safe=1',
      cyclic,
    };

    const redacted = redact(payload) as typeof payload & {
      cyclic: Record<string, unknown>;
    };

    expect(redacted.password).toBe('[redacted]');
    expect(redacted.nested.token).toBe('[redacted]');
    expect((redacted.nested.list[0] as { secret: string }).secret).toBe(
      '[redacted]',
    );
    expect((redacted.nested.list[1] as { safe: string }).safe).toBe('value');
    expect(redacted.SECRET_KEY).toBe('[redacted]');
    expect(redacted.callbackUrl).toContain('token=%5Bredacted%5D');
    expect(redacted.callbackUrl).toContain('safe=1');
    expect(redacted.cyclic.name).toBe('root');
    expect(typeof redacted.cyclic.self).toBe('string');
  });

  it('does not mutate values under a non-matching key', () => {
    expect(redact({ username: 'ok' })).toEqual({ username: 'ok' });
  });

  it('passes through primitives unchanged', () => {
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });

  it('leaves a plain string that is not a URL unchanged', () => {
    expect(redact('just a message')).toBe('just a message');
  });

  it('leaves a URL with no matching search parameter unchanged', () => {
    const url = 'https://example.com/callback?safe=1';
    expect(redact(url)).toBe(url);
  });

  it('handles a cyclic array without looping forever', () => {
    const cyclic: unknown[] = ['first'];
    cyclic.push(cyclic);

    const redacted = redact(cyclic);

    expect(redacted[0]).toBe('first');
    expect(typeof redacted[1]).toBe('string');
  });
});
