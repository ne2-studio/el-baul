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
