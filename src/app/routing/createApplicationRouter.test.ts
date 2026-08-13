import { describe, expect, it } from 'vitest';
import { buildTestRuntime } from '../testing/renderRoute';
import { createApplicationRouter } from './createApplicationRouter';

describe('createApplicationRouter', () => {
  it('the router is created with basename taken from configuration rather than a literal', async () => {
    const runtime = await buildTestRuntime({ basePath: '/not-a-literal' });

    const router = createApplicationRouter(runtime);

    expect(router.basename).toBe('/not-a-literal');
  });
});
