import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PersonaTaggingPicker } from '@/features/photos/components/PersonaTaggingPicker';
import { Persona } from '@/types';
import { storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Photos/PersonaTaggingPicker',
  component: PersonaTaggingPicker,
  tags: ['autodocs'],
} satisfies Meta<typeof PersonaTaggingPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const initialPersonas: Persona[] = [
  { id: '1', nickname: 'Abuela Rosa', avatarUrl: storybookAvatars.abuela } as Persona,
  { id: '2', nickname: 'Papá' } as Persona,
  { id: '3', nickname: 'Marta' } as Persona,
];

export const Default: Story = {
  args: {
    personas: initialPersonas,
    selectedIds: ['1'],
    onToggle: fn(),
    onCreatePersona: fn(),
  },
};

// Alternativa 1d: buscar + fila fija de "crear" + chips sin duplicar. Cubre las dos vías de
// crear una persona nueva sin salir del selector: escribir un nombre sin coincidencia (crea
// directamente) y dejar el buscador vacío (abre la hoja anidada "Nueva persona", solo apodo).
export const Interactive: Story = {
  args: { ...Default.args },
  render: (args) => {
    function InteractivePicker() {
      const [personas, setPersonas] = useState(args.personas);
      const [selectedIds, setSelectedIds] = useState<string[]>(args.selectedIds);
      const nextId = useRef(100);
      return (
        <PersonaTaggingPicker
          {...args}
          personas={personas}
          selectedIds={selectedIds}
          onToggle={(id) => {
            args.onToggle(id);
            setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
          }}
          onCreatePersona={async (nickname) => {
            args.onCreatePersona(nickname);
            const created = { id: `new-${nextId.current++}`, nickname } as Persona;
            setPersonas((prev) => [...prev, created]);
            return created;
          }}
        />
      );
    }
    return <InteractivePicker />;
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Marcar a "Papá" lo saca de la lista y lo convierte en chip — nunca se ve dos veces.
    await userEvent.click(canvas.getByRole('button', { name: /Papá/ }));
    await expect(args.onToggle).toHaveBeenCalledWith('2');
    await expect(canvas.queryByRole('button', { name: /^Papá$/ })).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Quitar a Papá' })).toBeInTheDocument();

    // Escribir un nombre sin coincidencia cambia la fila fija a "Crear y etiquetar" y crea
    // directamente, sin pasar por la hoja.
    const search = canvas.getByLabelText('Buscar persona');
    await userEvent.type(search, 'Tío Juan');
    await userEvent.click(canvas.getByRole('button', { name: /Crear y etiquetar "Tío Juan"/ }));
    await expect(args.onCreatePersona).toHaveBeenCalledWith('Tío Juan');
    await expect(canvas.getByRole('button', { name: 'Quitar a Tío Juan' })).toBeInTheDocument();

    // Con el buscador vacío, la fila fija abre la hoja "Nueva persona" (solo apodo).
    await userEvent.click(canvas.getByRole('button', { name: 'Crear nueva persona' }));
    const nicknameInput = body.getByPlaceholderText(/Ej\. Abuela/);
    await userEvent.type(nicknameInput, 'Tía Marisa');
    await userEvent.click(body.getByRole('button', { name: 'Añadir' }));
    await expect(args.onCreatePersona).toHaveBeenCalledWith('Tía Marisa');
    await expect(canvas.getByRole('button', { name: 'Quitar a Tía Marisa' })).toBeInTheDocument();
  },
};
