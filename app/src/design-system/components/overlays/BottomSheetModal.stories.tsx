import type { Meta, StoryObj } from '@storybook/react-vite';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

const meta = {
  title: 'Components/Overlays/BottomSheetModal',
  component: BottomSheetModal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Shared overlay shell for temporary decisions, forms and contextual actions that should sit above the current screen without becoming a full route.

### When to use
Use \`sm\` for confirmations and compact action sheets. Use \`lg\` for editing forms or denser modal flows; on desktop it becomes a side drawer. Use \`desktopCentered\` only for compact dialogs that read better centered on wide screens.

### When NOT to use
Do not use it for full-screen journeys, long navigation flows, or persistent panels. Avoid reimplementing backdrop, rounded sheet, viewport inset or desktop drawer behavior in feature modals.

### Typical examples
Delete photo/chapter confirmations, move photo, tag personas, edit baul info, add memory, manage access and plan-limit prompts.

### Common mistakes
Putting padding on the outer overlay instead of inside the sheet, using \`lg\` for simple confirmations, or nesting another modal-like surface inside it.

### Related components
\`Button\` for footer actions, \`Input\` and \`PartialDatePicker\` for form content, \`EditInfoModal\` and \`DateModal\` as product patterns built on this shell.
`,
      },
    },
  },
} satisfies Meta<typeof BottomSheetModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const placeholderContent = (
  <>
    <h2 className="text-lg font-semibold text-foreground mb-2">Título de la hoja</h2>
    <p className="text-muted-foreground">
      Este es el shell compartido por todos los modales de tipo "bottom sheet" de la
      aplicación. El contenido real (formularios, listas, confirmaciones) lo aporta cada
      modal concreto.
    </p>
  </>
);

export const Small: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    children: placeholderContent,
  },
};

export const SmallDesktopCentered: Story = {
  args: {
    ...Small.args,
    desktopCentered: true,
  },
};

export const Large: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    size: 'lg',
    children: placeholderContent,
  },
};
