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
    },
  })
);
