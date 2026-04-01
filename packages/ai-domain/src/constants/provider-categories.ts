export const ProviderCategoryInfo = {
  cloud_api: {
    label: 'Cloud API Providers',
    description: 'Remote API services requiring API keys',
  },
  local_server: {
    label: 'Local Servers',
    description: 'AI servers running on your machine',
  },
  in_browser: {
    label: 'In-Browser',
    description: 'Models running directly in the browser',
  },
} as const;
