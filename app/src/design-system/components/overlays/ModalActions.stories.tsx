import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/design-system/components/actions/Button';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

const meta = {
  title: 'Components/Overlays/ModalActions',
  component: ModalActions,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Standard action row for modal footers.

### When to use
Use it for pairs of modal actions such as cancel/save, cancel/delete or cancel/confirm.

### When NOT to use
Do not use it for page-level form actions, toolbar actions or long lists of choices.

### Behavior
Button text stays on one line. Actions share a single row when there is room; when the row cannot fit, actions wrap into separate rows with the primary action visually above the secondary action.
`,
      },
    },
  },
} satisfies Meta<typeof ModalActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div className="max-w-md rounded-2xl border border-border bg-background p-6">
      <ModalActions>
        <Button variant="secondary">Cancelar</Button>
        <Button>Guardar</Button>
      </ModalActions>
    </div>
  ),
};

export const LongLabels: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div className="w-72 rounded-2xl border border-border bg-background p-6">
      <ModalActions>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="danger">Sí, eliminar capítulo</Button>
      </ModalActions>
    </div>
  ),
};
