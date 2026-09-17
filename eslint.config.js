const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
