import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Separate from vite.config.ts so test-only concerns don't touch the production build
// config; merged in via mergeConfig purely to reuse the existing `@` -> src alias.
// 'node' environment: today's suite is pure-logic unit tests (roles/format), no DOM needed.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        // 'text-summary' with a `file` writes the totals table to coverage/summary.txt
        // instead of only stdout, so CI can drop it straight into the job's step summary.
        reporter: [['text-summary', { file: 'summary.txt' }], 'json-summary', 'html'],
        reportsDirectory: './coverage',
      },
    },
  })
);
