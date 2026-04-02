import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const baseTypeScriptConfig = tseslint.configs.recommended.map(config => ({
  ...config,
  languageOptions: {
    ...config.languageOptions,
    parserOptions: {
      ...config.languageOptions?.parserOptions,
      tsconfigRootDir: import.meta.dirname,
    },
  },
}));

export default defineConfig([
  {
    ignores: ['**/dist/**', '**/lib/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...baseTypeScriptConfig,
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
    },
  },
  {
    files: ['functions/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: './functions/tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'error',
    },
  },
]);
