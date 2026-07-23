import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Separate from vite.config.ts (rather than adding a `test:` block there) so the
// production build config stays untouched by test-only concerns — merged in via
// mergeConfig purely to reuse the existing `@` -> src alias, so test files can import
// with the same paths the app itself uses.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  })
);
