import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'infra/cloudflare/src/**/*.js']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      ...jsxA11y.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@lib/eventing/internal/*'],
              message: 'Eventing internals are private. Import from @lib/eventing.',
            },
            {
              group: ['@lib/react-behaviours/hooks/*'],
              message: 'Use @lib/react-behaviours instead of deep hook paths.',
            },
            {
              group: ['@lib/logging/**/index'],
              message: 'Import logging modules from @lib/logging barrel exports.',
            },
          ],
        },
      ],
    },
  },
  {
    // Config for CommonJS files (.cjs)
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'script',
    },
    rules: {
      // Allow require() in CommonJS files
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off', // Node.js globals are provided
    },
  },
])
