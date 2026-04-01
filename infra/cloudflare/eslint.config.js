import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import noWorkerFetchInBeforeAll from './eslint-rules/no-worker-fetch-in-before-all.js';
import describeRequiresSuiteType from './eslint-rules/describe-requires-suite-type.js';
import noInvalidSuiteContext from './eslint-rules/no-invalid-suite-context.js';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  })),
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    plugins: {
      'suite-context': {
        rules: {
          'no-invalid-suite-context': noInvalidSuiteContext,
        },
      },
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^log(Info|Warn|Error|Debug)$',
          argsIgnorePattern: '^_',
        },
      ],
      'suite-context/no-invalid-suite-context': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/index.ts'],
    rules: {
      'no-console': 'error',
    },
  },
  // Custom rules for test files
  {
    files: ['tests/**/*.ts'],
    plugins: {
      'worker-fetch-context': {
        rules: {
          'no-worker-fetch-in-before-all': noWorkerFetchInBeforeAll,
        },
      },
      'describe-suite-type': {
        rules: {
          'describe-requires-suite-type': describeRequiresSuiteType,
        },
      },
    },
    rules: {
      'worker-fetch-context/no-worker-fetch-in-before-all': 'error',
      'describe-suite-type/describe-requires-suite-type': 'warn',
    },
  },
  {
    files: ['scripts/**/*.ts', 'test-runner/script/**/*.ts', 'vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {},
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.wrangler/**',
      'test-runner/coverage/**',
      '**/*.js',
      '.stryker-tmp/**',
    ],
  }
);
