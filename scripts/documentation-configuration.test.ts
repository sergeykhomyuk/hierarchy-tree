import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Sentences unique to the Vite React template README this project started
// from - if any of these still match, the template was never replaced.
const VITE_TEMPLATE_SENTENCES = [
  'React + TypeScript + Vite',
  'minimal setup to get React working',
  'official plugins are available',
  'React Compiler is not enabled on this template',
  'Expanding the ESLint configuration',
];

describe('README.md', () => {
  it('README.md describes this project and carries no sentence of the Vite template', () => {
    const readme = readFileSync('README.md', 'utf-8');

    for (const sentence of VITE_TEMPLATE_SENTENCES) {
      expect(
        readme,
        `README.md still contains the Vite template sentence "${sentence}"`,
      ).not.toContain(sentence);
    }

    expect(readme, 'README.md must describe what the app does').toMatch(
      /organizational hierarchy/i,
    );
    expect(readme, 'README.md must describe how to run it').toMatch(
      /## Running it/,
    );
    expect(readme, 'README.md must describe how to test it').toMatch(
      /## Testing/,
    );
    expect(readme, 'README.md must describe how it deploys').toMatch(
      /## Deployment/,
    );
    expect(readme, 'README.md must say where the specs live').toContain(
      'specs/',
    );
  });

  it('README.md states that a client-side lookup is not authentication and the database is public', () => {
    const readme = readFileSync('README.md', 'utf-8');

    expect(readme).toMatch(/client-side lookup/i);
    expect(readme).toMatch(/not authentication/i);
    expect(readme).toMatch(/database[^.]*\bis public\b/i);
  });
});

const DEVIATION_COUNT_WORDS: Record<string, number> = { nine: 9, ten: 10 };

function sectionBody(
  content: string,
  heading: string,
  nextHeadingPrefix: string,
): string {
  const start = content.indexOf(heading);
  expect(start, `heading "${heading}" not found`).toBeGreaterThanOrEqual(0);
  const rest = content.slice(start + heading.length);
  const end = rest.indexOf(nextHeadingPrefix);
  return end === -1 ? rest : rest.slice(0, end);
}

describe('phase 3 decision log and ROADMAP.md', () => {
  it('the deviation count agrees in PRODUCT.md, the deviations section and the decision log', () => {
    const product = readFileSync('specs/phase-3-tree/PRODUCT.md', 'utf-8');
    const architecture = readFileSync('specs/ARCHITECTURE.md', 'utf-8');

    const invariantMatch = product.match(
      /185\. Every deviation this phase makes gets a decision-log entry[\s\S]*?There are \*\*(\w+)\*\*/,
    );
    expect(invariantMatch, 'invariant 185 count not found').not.toBeNull();
    const statedWord = (invariantMatch?.[1] ?? '').toLowerCase();
    const statedCount = DEVIATION_COUNT_WORDS[statedWord];
    expect(
      statedCount,
      `unrecognized count word "${statedWord}"`,
    ).toBeDefined();

    const deviationsSection = sectionBody(
      product,
      '## Deviations that need a decision-log entry',
      '\n## ',
    );
    const deviationItems = deviationsSection.match(/^\d+\.\s+\*\*/gm) ?? [];
    expect(
      deviationItems.length,
      'deviations section item count disagrees with invariant 185',
    ).toBe(statedCount);

    const decisionLogSection = sectionBody(
      architecture,
      '## 6. Decision log',
      '\n## 7.',
    );
    // Matches the entry's OWN dated tag, e.g. "(2026-08-19, phase-3-tree)" -
    // not every mention of the string "phase-3-tree" anywhere in an entry's
    // prose (a later entry's own body cites `PRODUCT.md`'s path and would
    // otherwise double-count itself).
    const phase3Entries =
      decisionLogSection.match(
        /\(\d{4}-\d{2}-\d{2}[^)]*phase-3-tree[^)]*\)/g,
      ) ?? [];
    expect(
      phase3Entries.length,
      'phase-3-tree decision-log entry count disagrees with invariant 185',
    ).toBe(statedCount);
  });

  it('every phase 3 checkbox in ROADMAP.md is ticked and the status board agrees', () => {
    const roadmap = readFileSync('specs/ROADMAP.md', 'utf-8');
    const phase3Section = sectionBody(
      roadmap,
      '## Phase 3 - Hierarchy Tree page',
      '\n## ',
    );
    const [outcomesBlock = '', exitCriteriaBlock = ''] =
      phase3Section.split('**Exit criteria**');

    const outcomeBoxes = outcomesBlock.match(/- \[.\]/g) ?? [];
    const exitBoxes = exitCriteriaBlock.match(/- \[.\]/g) ?? [];
    expect(outcomeBoxes.length, 'no outcome checkboxes found').toBeGreaterThan(
      0,
    );
    expect(
      exitBoxes.length,
      'no exit-criteria checkboxes found',
    ).toBeGreaterThan(0);
    for (const box of [...outcomeBoxes, ...exitBoxes]) {
      expect(box, 'a phase 3 checkbox is not ticked').toBe('- [x]');
    }

    const statusLineMatch = roadmap.match(
      /\*\*Phase 3 - Hierarchy Tree page\*\*: (.+)/,
    );
    expect(
      statusLineMatch,
      'phase 3 status board line not found',
    ).not.toBeNull();
    expect(statusLineMatch?.[1]).toBe(
      `done (${outcomeBoxes.length}/${outcomeBoxes.length} outcomes, ${exitBoxes.length}/${exitBoxes.length} exit criteria)`,
    );
  });
});
