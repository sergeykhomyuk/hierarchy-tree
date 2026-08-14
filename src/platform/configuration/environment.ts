export type RawEnvironment = Readonly<Record<string, string | undefined>>;

// The single import.meta.env read in the repository (invariant 13).
export function readEnvironment(): RawEnvironment {
  const env: Record<string, string | boolean | undefined> = import.meta.env;
  const raw: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(env)) {
    raw[key] = typeof value === 'boolean' ? String(value) : value;
  }

  return raw;
}

// Build-time constant folded by the bundler - re-exporting it here is what
// lets the kit-route guard (M4) read a development flag without a second
// import.meta.env read (invariant 13).
export const isDevelopmentBuild = import.meta.env.DEV;
