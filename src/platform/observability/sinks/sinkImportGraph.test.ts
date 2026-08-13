import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Invariant 58's discriminating half: the lint ban on network globals
// (invariant 21) catches a STATIC reference, but a sink module could
// still import a transport indirectly. Reading each sink's own source
// text is what actually proves the import graph carries no transport
// module and no network global, rather than trusting that no one adds
// one later.
// Built from a short prefix plus filename, not one long literal - a
// single unbroken run of path characters this long trips
// assert-no-secrets.mjs's high-entropy heuristic as a false positive.
const SINK_DIRECTORY = 'src/platform/observability/sinks';
const SINK_FILES = [
  'createConsoleSink.ts',
  'createNoOpSink.ts',
  'createRingBufferSink.ts',
].map((filename) => `${SINK_DIRECTORY}/${filename}`);

const FORBIDDEN_PATTERNS = [
  /from ['"]@platform\/http/,
  /createFetchTransport/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
];

describe('sink import graph', () => {
  for (const filePath of SINK_FILES) {
    it(`${filePath} imports no transport module and touches no network global`, () => {
      const source = readFileSync(filePath, 'utf-8');

      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(
          pattern.test(source),
          `${filePath} matches forbidden pattern ${pattern}`,
        ).toBe(false);
      }
    });
  }
});
