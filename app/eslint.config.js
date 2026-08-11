import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Bans imports that would let a presentational component reach into the container layer —
// see docs/architecture/frontend.md's Layers section. components/ must stay renderable in
// isolation (Storybook, tests) from props alone.
const componentBoundaryRule = {
  'no-restricted-imports': ['error', {
    patterns: [
      {
        group: ['@/store/*', '@/features/*/useCases', '@/features/*/useCases/*'],
        message: 'features/*/components/** must stay presentational — no store or use case access. ' +
          'That belongs in the feature\'s routes/*Route.tsx, passed down as props.',
      },
      {
        group: ['react-router-dom'],
        message: 'features/*/components/** must stay presentational — no routing. ' +
          'Navigate via a prop callback from the owning routes/*Route.tsx instead.',
      },
    ],
  }],
};

export default tseslint.config(
  // Mirrors .gitignore: local/generated scaffolding that was never part of the shipped app or
  // tsconfig's `include` — prototype/ and ds-bundle/ in particular pull in vendored bundles
  // (including a full copy of React's own source) that swamp real findings with noise.
  {
    ignores: [
      'dist', 'coverage', 'android', 'storybook-static', 'public',
      'prototype', 'ds-bundle', '.design-sync', '.ds-sync',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Matches the rest/discard idiom already used across the codebase, e.g.
      // `const { [id]: _removed, ...rest } = state` to drop a key immutably.
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    rules: componentBoundaryRule,
  },
  {
    files: ['.storybook/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
);
