import type { Meta, StoryObj } from '@storybook/react-vite';
import { FamilyTreeView } from '@/features/people/components/FamilyTreeView';
import { Persona, PersonaRelationship } from '@/types';
import { fixedStorybookDateIso, storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Features/People/FamilyTreeView',
  component: FamilyTreeView,
  tags: ['autodocs'],
} satisfies Meta<typeof FamilyTreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

function persona(id: string, nickname: string, overrides: Partial<Persona> = {}): Persona {
  return new Persona({
    id,
    baulId: 'b1',
    nickname,
    status: 'active',
    role: 'colaborador',
    isCustodio: false,
    invitedDate: fixedStorybookDateIso,
    canEdit: true,
    ...overrides,
  });
}

function rel(parentId: string, childId: string): PersonaRelationship {
  return new PersonaRelationship({ parentId, childId });
}

const sharedArgs = {
  onSelectPersona: () => alert('onSelectPersona clicked'),
  onBackToMosaico: () => alert('onBackToMosaico clicked'),
};

export const Empty: Story = {
  args: { ...sharedArgs, personas: [], relationships: [] },
};

export const SimpleChain: Story = {
  args: {
    ...sharedArgs,
    personas: [persona('a', 'Carmen', { avatarUrl: storybookAvatars.abuela }), persona('b', 'Pedro'), persona('c', 'Laura')],
    relationships: [rel('a', 'b'), rel('b', 'c')],
  },
};

export const TwoParents: Story = {
  args: {
    ...sharedArgs,
    personas: [
      persona('a', 'Carmen', { avatarUrl: storybookAvatars.abuela }),
      persona('b', 'Antonio', { isCustodio: true }),
      persona('c', 'Pedro'),
    ],
    relationships: [rel('a', 'c'), rel('b', 'c')],
  },
};

export const BranchingFamily: Story = {
  args: {
    ...sharedArgs,
    personas: [
      persona('a', 'Carmen'), persona('b', 'Antonio'), persona('c', 'Pedro'),
      persona('d', 'Laura'), persona('e', 'Miguel'), persona('f', 'Sofía'), persona('g', 'Nico'),
    ],
    relationships: [
      rel('a', 'c'), rel('b', 'c'),
      rel('c', 'd'), rel('c', 'e'),
      rel('d', 'f'), rel('d', 'g'),
    ],
  },
};

export const DisconnectedComponents: Story = {
  args: {
    ...sharedArgs,
    personas: [persona('a', 'Carmen'), persona('b', 'Pedro'), persona('c', 'Manolo'), persona('d', 'Rosa')],
    relationships: [rel('a', 'b'), rel('c', 'd')],
  },
};

// Uso real en la pestaña "Familia" de la ficha de una persona (PersonaFamiliaTabContainer):
// focusPersonaId recorta el árbol a la familia inmediata de "Pedro" — sus padres, su hermana
// Marta y su hija Laura — dejando fuera tanto a su sobrino (hijo de Marta, no de Pedro) como a
// la familia de Manolo/Rosa, sin relación con él, y sin botón "Volver a Mosaico" en el empty
// state.
export const FocusedOnOnePersona: Story = {
  args: {
    ...sharedArgs,
    personas: [
      persona('a', 'Carmen'), persona('b', 'Antonio'), persona('c', 'Pedro'),
      persona('m', 'Marta'), persona('n', 'Sobrino'),
      persona('d', 'Laura'), persona('e', 'Manolo'), persona('f', 'Rosa'),
    ],
    relationships: [
      rel('a', 'c'), rel('b', 'c'),
      rel('a', 'm'), rel('b', 'm'),
      rel('m', 'n'),
      rel('c', 'd'),
      rel('e', 'f'),
    ],
    focusPersonaId: 'c',
  },
};

export const FocusedOnOnePersonaEmpty: Story = {
  args: {
    ...sharedArgs,
    personas: [persona('a', 'Manolo')],
    relationships: [],
    focusPersonaId: 'a',
  },
};
