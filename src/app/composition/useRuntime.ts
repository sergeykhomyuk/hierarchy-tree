import { useContext } from 'react';
import { RuntimeContext } from './runtimeContext';
import type { Runtime } from './createRuntime';

export function useRuntime(): Runtime {
  const runtime = useContext(RuntimeContext);
  if (runtime === null) {
    throw new Error('useRuntime must be read inside a RuntimeContext.Provider');
  }
  return runtime;
}
