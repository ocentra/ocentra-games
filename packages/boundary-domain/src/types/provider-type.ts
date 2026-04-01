export const ProviderType = {
  LOCAL: 'local',
  OPENAI: 'openai',
  OPENROUTER: 'openrouter',
  LMSTUDIO: 'lmstudio',
  NATIVE: 'native',
  TABAGENT_SERVER: 'tabagent_server',
} as const;

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];
