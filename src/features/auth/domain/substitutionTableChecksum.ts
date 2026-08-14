const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

export function substitutionTableChecksum(table: readonly number[]): number {
  let hash = FNV_OFFSET_BASIS;
  for (const entry of table) {
    hash ^= entry & 0xff;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}
