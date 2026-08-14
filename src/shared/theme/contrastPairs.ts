export type ContrastPair = {
  foreground: string;
  background: string;
  minimumRatio: number;
};

export const contrastPairs: readonly ContrastPair[] = [
  { foreground: 'ink', background: 'surface', minimumRatio: 4.5 },
  { foreground: 'ink-muted', background: 'canvas-app', minimumRatio: 4.5 },
  { foreground: 'ink-faint', background: 'surface', minimumRatio: 4.5 },
  { foreground: 'on-primary', background: 'primary', minimumRatio: 4.5 },
  { foreground: 'focus-ring', background: 'surface', minimumRatio: 3 },
  { foreground: 'border-field', background: 'surface', minimumRatio: 3 },
  { foreground: 'danger', background: 'danger-surface', minimumRatio: 4.5 },
];
