import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createViteConfig } from './vite.config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

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
  createViteConfig(),
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.{ts,tsx}'],
            setupFiles: ['./src/test/setup.ts'],
            coverage: {
              provider: 'v8',
              include: ['src/**/*.{ts,tsx}'],
              // 'text-summary' with a `file` writes the totals table to coverage/summary.txt
              // instead of only stdout, so CI can drop it straight into the job's step summary.
              reporter: [['text-summary', { file: 'summary.txt' }], 'json-summary', 'html'],
              reportsDirectory: './coverage',
            },
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, '.storybook'),
              storybookScript: 'npm run storybook -- --no-open',
            }),
          ],
          // `include` pre-bundles deps we know are only reachable from a handful of stories
          // (react-router-dom/zustand via PhotoViewer's withRouter decorator, motion/react
          // via RecuerdosList/OnboardingCarousel, ...); `entries` backs that up by having
          // Vite's esbuild scanner crawl every story file up front instead of discovering
          // each story's dependencies lazily as the test runner renders it. This narrows,
          // but on its own doesn't eliminate, a known upstream @storybook/addon-vitest
          // failure mode (storybookjs/storybook#33067, #33347): a dependency discovered
          // mid-run forces Vite to restart its dev server, breaking whatever OTHER story
          // happens to be in flight at that moment (`Cannot read properties of null
          // (reading 'useRef'/'useEffect')`, `Failed to fetch dynamically imported module`,
          // `Cannot connect to the iframe` — on a different, unrelated story every time).
          // `isolate: false` below is what actually closes it out in practice.
          optimizeDeps: {
            entries: ['src/**/*.stories.tsx'],
            include: ['react-router-dom', 'zustand', '@capacitor/core', '@capacitor-community/media', 'motion/react'],
          },
          test: {
            name: 'storybook',
            testTimeout: 120000,
            // Defense-in-depth for ordinary flaky assertions (e.g. a hover/CSS-transition
            // race) — distinct from the collection-time failures above, which a retry of
            // an individual test can't catch.
            retry: 2,
            // The fix for the optimizeDeps issue above: per Storybook's own vitest-addon
            // docs, "Cannot connect to the iframe" / "Failed to fetch dynamically imported
            // module" are resource-overwhelm errors, common in constrained/CI environments,
            // and `isolate: false` (share one browser context across files instead of
            // tearing one down and spinning up a new one per file) is their documented fix.
            // Confirmed locally: ~9/9 clean runs with this on vs. ~2/9 without.
            isolate: false,
            browser: {
              enabled: true,
              provider: playwright({}),
              headless: true,
              instances: [{ browser: 'chromium' }],
            },
            setupFiles: ['./.storybook/vitest.setup.ts'],
          },
        },
      ],
    },
  })
);
