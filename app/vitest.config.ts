import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Separate from vite.config.ts (rather than adding a `test:` block there) so the
// production build config stays untouched by test-only concerns — merged in via
// mergeConfig purely to reuse the existing `@` -> src alias, so test files can import
// with the same paths the app itself uses.
//
// 'node' is the default environment (not jsdom) because most of this suite is level-1
// tests (pure logic, stores, mappers) that don't need a DOM and run faster without one
// — see docs/adr/0001-frontend-testing-strategy.md. Component tests opt into jsdom
// per-file with a `// @vitest-environment jsdom` docblock at the top of the file.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        // 'text-summary' with a `file` writes the totals table to coverage/summary.txt
        // instead of only stdout, so CI can drop it straight into the job's step summary.
        reporter: [['text-summary', { file: 'summary.txt' }], 'json-summary'],
        reportsDirectory: './coverage',
      },
    },
  })
);
