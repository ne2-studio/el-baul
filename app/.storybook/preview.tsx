import type { Preview } from '@storybook/react-vite'
import '../src/styles/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    },

    // Sidebar order: from generic/reusable (Foundations) down to app-specific (Screens),
    // instead of Storybook's default alphabetical order.
    options: {
      storySort: {
        order: ['Foundations', 'Components', 'Patterns', 'Layouts', 'Features', 'Screens'],
      },
    },
  },
};

export default preview;