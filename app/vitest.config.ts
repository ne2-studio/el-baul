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
          // Pre-bundled explicitly: features/*/containers/* (self-sufficient tab/panel
          // components, see docs/architecture/frontend.md) are the first things under
          // components/ to pull in these deps, e.g. via PhotosView.stories.tsx's withRouter
          // decorator (react-router-dom/zustand) and PhotoViewer.stories.tsx's
          // usePhotoSettingsMenu, whose download action pulls in the Capacitor packages.
          // Left implicit, Vite discovers them mid-run on first render and reloads the whole
          // browser-mode test context, which breaks React for any story already in flight
          // (`Cannot read properties of null (reading 'useRef'/'useEffect')`).
          optimizeDeps: {
            include: ['react-router-dom', 'zustand', '@capacitor/core', '@capacitor-community/media'],
          },
          test: {
            name: 'storybook',
            testTimeout: 120000,
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
