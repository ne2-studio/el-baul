import type { Preview } from '@storybook/react-vite'
import '../src/styles/tailwind.css'
import '../src/styles/theme.css'
import './storybook.css'

const fixedNow = new Date('2024-08-20T12:00:00.000Z').valueOf();
const OriginalDate = Date;

class FixedDate extends OriginalDate {
  constructor(...args: any[]) {
    super(...(args.length === 0 ? [fixedNow] : args));
  }

  static now() {
    return fixedNow;
  }
}

Object.setPrototypeOf(FixedDate, OriginalDate);
globalThis.Date = FixedDate as DateConstructor;

Math.random = () => 0.37;

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
