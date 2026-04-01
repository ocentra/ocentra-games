import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import requiredFieldInitialized from './eslint-rules/required-field-initialized.js'
import enforceDeferredResolution from './eslint-rules/enforce-deferred-resolution.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(dirname(__filename))

export default defineConfig([
  {
    ignores: [
      '**/*.d.ts',
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/*.min.js',
      '**/coverage/**',
      '**/*.log',
      '**/*.tsbuildinfo',
      'infra/cloudflare/**',
      'infra/firebase/**',
      'Rust/**',
      '**/.stryker-tmp/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/test-ledger/**',
      '**/database/**',
      '**/tmpclaude-*/**',
      '**/.test-storage/**',
      '**/codeql-results/**',
      '**/.codeql/**',
      '**/verification-results/**',
      '**/load-test-results/**',
      '**/*.db',
      '**/*.db-shm',
      '**/*.db-wal',
      '**/.vite-dev.lock',
      'packages/ai-domain/tests/**',
      'packages/ai-domain/vitest.config.ts',
      'packages/**',
      '!packages/ai-domain/src/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    ignores: ['scripts/**/*.ts', 'infra/cloudflare/**', ...(Array.isArray(config.ignores) ? config.ignores : [])],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        tsconfigRootDir: __dirname,
      },
    },
  })),
  {
    files: ['vite/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['scripts/**/*.ts', 'vitest.config.ts', 'vite.config.ts', 'playwright.config.ts'],
    ...tseslint.configs.recommended[0],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.node.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    ...tseslint.configs.recommended[0],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/test/**',
      '**/__tests__/**',
      'scripts/**/*.ts',
      'vitest.config.ts',
      'vite.config.ts',
      'playwright.config.ts',
      'infra/cloudflare/**',
      'packages/**/*.ts',
    ],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'required-field': { rules: { 'required-field-initialized': requiredFieldInitialized } },
      'deferred': { rules: { 'enforce-deferred-resolution': enforceDeferredResolution } },
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      ...reactHooks.configs.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      ...jsxA11y.configs.recommended.rules,
      'required-field/required-field-initialized': 'error',
      'deferred/enforce-deferred-resolution': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/constants',
              message: 'No barrel imports (Rule 5.1). Import from specific files, e.g. @/constants/assets, @/constants/game.',
            },
            {
              name: '@/constants/index',
              message: 'No barrel imports (Rule 5.1). Import from specific files.',
            },
            {
              name: '@/utils',
              message: 'No barrel imports (Rule 5.1). Import from specific files under @/utils/....',
            },
            {
              name: '@/utils/index',
              message: 'No barrel imports (Rule 5.1). Import from specific files.',
            },
            {
              name: '@/logic',
              message: 'No barrel imports (Rule 5.1). Import from specific files under @/logic/....',
            },
            {
              name: '@/logic/index',
              message: 'No barrel imports (Rule 5.1). Import from specific files.',
            },
          ],
          patterns: [
            {
              group: ['@lib/eventing/internal/*'],
              message: 'Eventing internals are private. Import from @lib/eventing.',
            },
            {
              group: ['**/react-behaviours/**'],
              message: 'Use @ocentra/behaviour-domain for ReactBehaviour, BehaviourHost, useBehaviour, useBehaviourState.',
            },
            {
              group: ['@lib/logging/**/index'],
              message: 'Import logging modules from @lib/logging barrel exports.',
            },
            {
              group: ['**/storage-event-client', '@ocentra/ai-domain/storage/storage-event-client'],
              message: 'Do not import storage-event-client from src. Use model-storage-api or ai-domain facades instead. (A7/A12 boundary rule)',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ai-domain/src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        project: './packages/ai-domain/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message:
            'Do not use global fetch in ai-domain. Use injected fetch adapter (setModelStorageFetchAdapter, adapters.browserLocal.fetch, KokoroTokenizer fetch option). (A10)',
        },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'script',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['scripts/**/*.js', 'packages/*/scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      'no-undef': 'off',
    },
  },
])
