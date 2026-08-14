export type KeyValueStorage = {
  read(key: string): string | null;
  // Returns false on a persist failure rather than throwing, so the
  // caller handles it as an outcome (invariant 79).
  write(key: string, value: string): boolean;
  remove(key: string): void;
};
