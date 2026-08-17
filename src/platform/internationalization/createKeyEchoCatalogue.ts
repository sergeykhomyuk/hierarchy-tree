import type { Catalogue } from './catalogue';

export function createKeyEchoCatalogue(catalogue: Catalogue): Catalogue {
  return echoLeaves(catalogue, []);
}

function echoLeaves(node: Catalogue, path: readonly string[]): Catalogue {
  const echoed: Record<string, Catalogue | string> = {};
  for (const [key, value] of Object.entries(node)) {
    const leafPath = [...path, key];
    echoed[key] =
      typeof value === 'string'
        ? leafPath.join('.')
        : echoLeaves(value, leafPath);
  }
  return echoed;
}
