export interface AICatalogConfigField {
  key: string;
  label: string;
  type: 'text' | 'url' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface AICatalogModelInfo {
  id: string;
  name: string;
  contextWindow: number;
}

export interface AICatalogProviderEntry {
  id: string;
  name: string;
  description: string;
  website: string;
  authType: string;
  category: 'cloud_api' | 'local_server' | 'in_browser';
  supportsStreaming: boolean;
  supportsModelListing: boolean;
  configFields: AICatalogConfigField[];
  defaultModels: AICatalogModelInfo[];
}

export interface AICatalogPricingEntry {
  inputPer1k: number;
  outputPer1k: number;
}

export interface AICatalog {
  version: number;
  providers: AICatalogProviderEntry[];
  pricing: Record<string, AICatalogPricingEntry>;
}
