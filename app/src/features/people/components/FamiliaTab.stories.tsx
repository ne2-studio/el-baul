import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FamiliaTab, FamiliaView } from '@/features/people/components/FamiliaTab';
import { Persona, PersonaRelationship } from '@/types';
import { fixedStorybookDateIso, storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Features/People/FamiliaTab',
  component: FamiliaTab,
  tags: ['autodocs'],
} satisfies Meta<typeof FamiliaTab>;

export default meta;
type Story = StoryObj<typeof meta>;

function persona(id: string, nickname: string, overrides: Partial<Persona> = {}): Persona {
  return new Persona({
    id, baulId: 'b1', nickname, status: 'active', role: 'colaborador', isCustodio: false,
    invitedDate: fixedStorybookDateIso, canEdit: true, ...overrides,
  });
}

const personas = [
  persona('1', 'Carmen', { avatarUrl: storybookAvatars.abuela }),
  persona('2', 'Antonio', { isCustodio: true }),
  persona('3', 'Pedro'),
  persona('4', 'Laura'),
  persona('5', 'Manolo'),
];

const relationships = [
  new PersonaRelationship({ parentId: '1', childId: '3' }),
  new PersonaRelationship({ parentId: '2', childId: '3' }),
  new PersonaRelationship({ parentId: '3', childId: '4' }),
];

// Interactiva de verdad (el toggle Mosaico/Árbol cambia de vista al hacer click) — el propio
// estado de qué vista está activa vive en BaulPersonasTabContainer en la app real, así que aquí
// se simula con un useState local para poder navegar la story.
function InteractiveFamiliaTab({ initialView, relationships: rels }: { initialView: FamiliaView; relationships: PersonaRelationship[] }) {
  const [view, setView] = useState<FamiliaView>(initialView);
  return (
    <FamiliaTab
      personas={personas}
      relationships={rels}
      currentUserEmail="carmen@example.com"
      view={view}
      onViewChange={setView}
      onSelectPersona={() => alert('onSelectPersona clicked')}
    />
  );
}

export const Mosaico: Story = {
  args: { personas, relationships, view: 'mosaico', onViewChange: () => undefined, onSelectPersona: () => undefined },
  render: () => <InteractiveFamiliaTab initialView="mosaico" relationships={relationships} />,
};

export const ArbolGenealogico: Story = {
  args: { personas, relationships, view: 'arbol', onViewChange: () => undefined, onSelectPersona: () => undefined },
  render: () => <InteractiveFamiliaTab initialView="arbol" relationships={relationships} />,
};

export const ArbolSinRelaciones: Story = {
  args: { personas, relationships: [], view: 'arbol', onViewChange: () => undefined, onSelectPersona: () => undefined },
  render: () => <InteractiveFamiliaTab initialView="arbol" relationships={[]} />,
};
