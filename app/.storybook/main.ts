import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
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
    };
  },
};
export default config;