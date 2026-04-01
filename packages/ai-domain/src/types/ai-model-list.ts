export interface ModelQuantInfo {
  path: string;
  dtype: string;
  displayName?: string;
  enabled?: boolean;
  priority?: number;
}

export interface AIModelEntry {
  modelId: string;
  displayName: string;
  description?: string;
  quants: ModelQuantInfo[];
  enabled?: boolean;
  priority?: number;
  provider?: string;
  tags?: string[];
}
