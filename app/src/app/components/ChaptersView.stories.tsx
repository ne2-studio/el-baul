import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChaptersView, Chapter } from './ChaptersView';
import { Baul } from './BaulesList';
import { Persona, Recuerdo } from '@/types';

const meta = {
  title: 'Screens/Baul/Detail',
  component: ChaptersView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ChaptersView>;

export default meta;
type Story = StoryObj<typeof meta>;

const baul: Baul = {
  id: 'b1',
  name: 'Familia García',
  description: 'Nuestros mejores momentos, todos juntos',
  chapterCount: 3,
  coverPhotoUrl: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=1200',
  lastUpdated: 'hace 2 días',
  isCustodio: true,
};

const chapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2024', photoCount: 24, recuerdoCount: 3, coverPhotoUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400', minDate: { year: 2024, month: 7 }, maxDate: { year: 2024, month: 8 } },
  { id: 'c2', name: 'Navidad', photoCount: 12, recuerdoCount: 1, minDate: { year: 2023, month: 12 }, maxDate: { year: 2023, month: 12 } },
  { id: 'c3', name: 'Cumpleaños de la abuela', photoCount: 8, minDate: { year: 2023, month: 5 }, maxDate: { year: 2023, month: 5 } },
];

const personas: Persona[] = [
  { id: 'p1', baulId: 'b1', nickname: 'Abuela Rosa', status: 'active', role: 'colaborador', invitedDate: 'hace 1 año' } as Persona,
  { id: 'p2', baulId: 'b1', nickname: 'Papá', status: 'active', role: 'administrador', invitedDate: 'hace 1 año' } as Persona,
];

const recuerdos: Recuerdo[] = [
  { id: 'r1', text: 'Un verano inolvidable en familia.', userName: 'Ana García', createdAt: '2024-07-15T10:00:00Z' } as Recuerdo,
];

const sharedDefaults = {
  baul,
  chapters,
  personas,
  recuerdos,
  isAdmin: true,
  onBack: () => alert('onBack clicked'),
  onSelectChapter: (chapter: Chapter) => alert(`onSelectChapter: ${chapter.name}`),
  onCreateChapter: () => alert('onCreateChapter clicked'),
  onOpenLoosePhotos: () => alert('onOpenLoosePhotos clicked'),
  onCreatePersona: async () => true,
  onSelectPersona: (persona: Persona) => alert(`onSelectPersona: ${persona.nickname}`),
  onCreateRecuerdo: async () => true,
  onOpenChat: () => alert('onOpenChat clicked'),
  onUpdateBaulInfo: async () => true,
  onRequestBaulDeletion: () => alert('onRequestBaulDeletion clicked'),
};

export const Default: Story = {
  args: sharedDefaults,
};

export const WithLoosePhotos: Story = {
  args: {
    ...sharedDefaults,
    loosePhotos: [
      { id: 'lp1', thumbnailUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=200' },
      { id: 'lp2', thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200' },
    ],
  },
};

export const Empty: Story = {
  args: {
    ...sharedDefaults,
    chapters: [],
    personas: [],
    recuerdos: [],
  },
};

export const PersonasTab: Story = {
  args: {
    ...sharedDefaults,
    initialTab: 'personas',
  },
};

export const RecuerdosTab: Story = {
  args: {
    ...sharedDefaults,
    initialTab: 'recuerdos',
  },
};

export const ReadOnlyCollaborator: Story = {
  args: {
    ...sharedDefaults,
    isAdmin: false,
    baul: { ...baul, isCustodio: false, role: 'colaborador' },
    onCreatePersona: undefined,
    onUpdateBaulInfo: undefined,
    onRequestBaulDeletion: undefined,
  },
};
