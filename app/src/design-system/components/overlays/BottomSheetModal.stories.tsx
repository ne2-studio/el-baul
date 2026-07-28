import type { Meta, StoryObj } from '@storybook/react-vite';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { viewportGlobals } from '@/storybook/viewports';

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

const editBaulContent = (
  <>
    <div>
      <h2 className="text-xl font-serif text-foreground mb-2">Editar información del baúl</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        En móvil esta hoja se abre desde abajo. En escritorio, el mismo `size="lg"` se convierte
        en un panel lateral para dejar visible el contexto de la pantalla.
      </p>
    </div>
    <Input
      label="Nombre del baúl"
      value="Familia García"
      onChange={() => {}}
      helperText="Usa un nombre que la familia reconozca fácilmente."
    />
    <Input
      label="Descripción"
      value="Nuestros mejores momentos, viajes y celebraciones compartidas durante estos años."
      onChange={() => {}}
      multiline
      rows={5}
    />
    <div className="rounded-xl bg-muted/50 border border-border p-4">
      <h3 className="font-medium text-foreground mb-2">Contenido largo</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Esta sección expone el comportamiento de overflow: la hoja mantiene un alto máximo y
        el contenido interno hace scroll sin sacar las acciones de su contexto visual.
      </p>
    </div>
    <div className="space-y-3">
      <Button variant="primary" fullWidth>Guardar cambios</Button>
      <Button variant="secondary" fullWidth>Cancelar</Button>
    </div>
  </>
);

const destructiveConfirmationContent = (
  <>
    <h2 className="text-lg font-semibold text-foreground mb-2">Eliminar capítulo</h2>
    <p className="text-muted-foreground mb-5">
      Las fotos dejarán de estar agrupadas en este capítulo, pero seguirán dentro del baúl.
    </p>
    <div className="flex flex-col-reverse md:flex-row gap-3">
      <Button variant="secondary" fullWidth>Cancelar</Button>
      <Button variant="danger" fullWidth>Eliminar capítulo</Button>
    </div>
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

export const EditFormSheetMobile: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    size: 'lg',
    children: editBaulContent,
  },
  globals: viewportGlobals.mobile,
};

export const EditFormSheetNarrowOverflow: Story = {
  args: {
    ...EditFormSheetMobile.args,
  },
  globals: viewportGlobals.narrow,
};

export const EditFormDesktopDrawer: Story = {
  args: {
    ...EditFormSheetMobile.args,
  },
  globals: viewportGlobals.desktop,
};

export const DestructiveConfirmationDesktopDialog: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    desktopCentered: true,
    backdropOpacity: 60,
    children: destructiveConfirmationContent,
  },
  globals: viewportGlobals.desktop,
};
