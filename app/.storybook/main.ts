import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs', '@storybook/addon-vitest'],
  framework: '@storybook/react-vite',
  // The app's vite.config.ts is merged in automatically. VitePWA is meant for the
  // real app build and breaks Storybook's static build (it tries to precache
  // Storybook's own manager/preview bundles as a service worker) - its plugins
  // come back as a nested array, so the filter has to recurse.
  async viteFinal(viteConfig) {
    function stripPwaPlugins(plugins: unknown[]): unknown[] {
      return plugins
        .filter((plugin) => {
          const name = plugin && typeof plugin === 'object' && 'name' in plugin ? (plugin as { name: unknown }).name : undefined;
          return !(typeof name === 'string' && name.startsWith('vite-plugin-pwa'));
        })
        .map((plugin) => (Array.isArray(plugin) ? stripPwaPlugins(plugin) : plugin));
    }
    return {
      ...viteConfig,
      plugins: stripPwaPlugins(viteConfig.plugins ?? []) as typeof viteConfig.plugins,
      build: {
        ...viteConfig.build,
        // Storybook's own docs/a11y/runtime bundles are larger than Vite's app-oriented
        // default. Keep this Storybook-only so the real app build still reports large
        // product chunks normally.
        chunkSizeWarningLimit: 1300,
      },
    };
  },
};
export default config;
