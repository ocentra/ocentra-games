export interface RuntimeConstraintsAdapter {
  maxModelSizeBytes?: number;
  backgroundPolicy?: 'allow' | 'deny';
}

let runtimeConstraintsAdapter: RuntimeConstraintsAdapter | null = null;

export function setRuntimeConstraintsAdapter(adapter: RuntimeConstraintsAdapter | null): void {
  runtimeConstraintsAdapter = adapter;
}

export function getRuntimeConstraintsAdapter(): RuntimeConstraintsAdapter | null {
  return runtimeConstraintsAdapter;
}
