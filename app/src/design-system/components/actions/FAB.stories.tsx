import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, Upload, Sparkles, Pencil, BookOpen } from 'lucide-react';
import { SimpleFAB, ExpandableFAB } from '@/design-system/components/actions/FAB';

// Sin autodocs a propósito: las props son pocas y simples, no hay valor en una tabla
// autogenerada. Lo que importa es CUÁNDO usar cada variante (ver comentarios en FAB.tsx) y
// cómo se ve en las pantallas reales que lo usan — documentado abajo como stories con nombre.
const meta = {
  title: 'Components/Actions/FAB',
  component: SimpleFAB,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SimpleFAB>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Uso real de SimpleFAB: un único CTA protagonista por pantalla ────────────────────────

// BaulesList: el único CTA de la pantalla, siempre visible.
export const BaulesListNuevoBaul: Story = {
  args: {
    label: 'Nuevo baúl',
    onClick: () => alert('onClick'),
  },
};

// PhotosView (pestaña "Fotos"): oculto fuera de esa pestaña y durante la selección de fotos.
export const PhotosViewSubirFotos: Story = {
  args: {
    label: 'Subir fotos',
    icon: <Plus className="w-5 h-5" />,
    onClick: () => alert('onClick'),
  },
};

// RecuerdosFeed: oculto si el feed no está activo o hay una selección en curso.
export const RecuerdosFeedEscribeLoQueRecuerdas: Story = {
  args: {
    label: 'Escribe lo que recuerdas',
    icon: <BookOpen className="w-5 h-5" />,
    onClick: () => alert('onClick'),
  },
};

// PersonaDetailScreen (pestaña "Biografía"): oculto si el usuario no tiene permiso de edición.
export const PersonaDetailScreenEditarBiografia: Story = {
  args: {
    label: 'Editar biografía',
    icon: <Pencil className="w-5 h-5" />,
    onClick: () => alert('onClick'),
  },
};

// ─── Uso real de ExpandableFAB: 2+ CTAs que competirían por el mismo protagonismo ─────────

// ChaptersView (pestaña "Capítulos"): "Nuevo capítulo" siempre, "Subir fotos" solo si el
// baúl lo permite.
export const ChaptersViewCapitulos: Story = {
  args: {
    label: 'unused',
    onClick: () => {},
  },
  render: () => (
    <ExpandableFAB
      actions={[
        { label: 'Nuevo capítulo', icon: <Plus className="w-4 h-4" />, onClick: () => alert('Nuevo capítulo') },
        { label: 'Subir fotos', icon: <Upload className="w-4 h-4" />, onClick: () => alert('Subir fotos') },
      ]}
    />
  ),
};

// Ejemplo ilustrativo con más acciones, para mostrar cómo escala el desplegable más allá de 2.
export const ThreeActions: Story = {
  args: {
    label: 'unused',
    onClick: () => {},
  },
  render: () => (
    <ExpandableFAB
      actions={[
        { label: 'Nuevo capítulo', icon: <Plus className="w-4 h-4" />, onClick: () => alert('Nuevo capítulo') },
        { label: 'Subir fotos', icon: <Upload className="w-4 h-4" />, onClick: () => alert('Subir fotos') },
        { label: 'Ayúdame a recordar', icon: <Sparkles className="w-4 h-4" />, onClick: () => alert('Ayúdame a recordar') },
      ]}
    />
  ),
};
