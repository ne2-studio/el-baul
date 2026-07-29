import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChaptersView } from '@/features/baules/components/ChaptersView';
import { Baul, Chapter, Persona, Recuerdo } from '@/types';
import { storybookEdgeText, storybookPhotos } from '@/storybook/fixtures';
import { viewportGlobals } from '@/storybook/viewports';

const meta = {
  title: 'Screens/Baul/BaulDetail',
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
  coverPhotoUrl: storybookPhotos.familyCover,
  lastUpdated: 'hace 2 días',
  isCustodio: true,
  role: 'custodio',
};

const chapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2024', photoCount: 24, lastUpdated: 'hace 2 días', recuerdoCount: 3, undatedPhotoCount: 0, coverPhotoUrl: storybookPhotos.beach, minDate: { year: 2024, month: 7 }, maxDate: { year: 2024, month: 8 } },
  { id: 'c2', name: 'Navidad', photoCount: 12, lastUpdated: 'hace 1 mes', recuerdoCount: 1, undatedPhotoCount: 0, minDate: { year: 2023, month: 12 }, maxDate: { year: 2023, month: 12 } },
  { id: 'c3', name: 'Cumpleaños de la abuela', photoCount: 8, lastUpdated: 'hace 3 meses', recuerdoCount: 0, undatedPhotoCount: 0, minDate: { year: 2023, month: 5 }, maxDate: { year: 2023, month: 5 } },
  { id: 'c4', name: 'La casa del pueblo', photoCount: 17, lastUpdated: 'hace 4 meses', recuerdoCount: 2, undatedPhotoCount: 1, coverPhotoUrl: storybookPhotos.people, minDate: { year: 2022, month: 8 }, maxDate: { year: 2022, month: 8 } },
  { id: 'c5', name: 'Primeros recuerdos familiares', photoCount: 9, lastUpdated: 'hace 1 año', recuerdoCount: 4, undatedPhotoCount: 0, coverPhotoUrl: storybookPhotos.landscape, minDate: { year: 1998 }, maxDate: { year: 2001 } },
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
      { id: 'lp1', thumbnailUrl: storybookPhotos.album },
      { id: 'lp2', thumbnailUrl: storybookPhotos.sunset },
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
    baul: { ...baul, isCustodio: false, role: 'colaborador' },
    onCreatePersona: undefined,
    onUpdateBaulInfo: undefined,
    onRequestBaulDeletion: undefined,
  },
};

export const ChapterOverviewMobileTwoColumnGrid: Story = {
  args: sharedDefaults,
  globals: viewportGlobals.mobile,
};

export const ChapterOverviewNarrowScrollableTabs: Story = {
  args: sharedDefaults,
  globals: viewportGlobals.narrow,
};

export const ChapterOverviewDesktopDistributedTabs: Story = {
  args: sharedDefaults,
  globals: viewportGlobals.desktop,
};

export const EdgeCasesMixedMetadata: Story = {
  args: {
    ...sharedDefaults,
    baul: {
      ...baul,
      name: storybookEdgeText.longBaulName,
      description: storybookEdgeText.missingMetadataNote,
      coverPhotoUrl: undefined,
      memberCount: 18,
    },
    chapters: [
      {
        id: 'edge-c1',
        name: storybookEdgeText.longChapterName,
        photoCount: 128,
        lastUpdated: 'hace 10 minutos',
        recuerdoCount: 27,
        undatedPhotoCount: 41,
        coverPhotoUrl: storybookPhotos.landscape,
        minDate: { year: 1987 },
        maxDate: { year: 2024, month: 8 },
      },
      {
        id: 'edge-c2',
        name: 'Capítulo sin portada ni fechas',
        photoCount: 6,
        lastUpdated: '',
        recuerdoCount: 0,
        undatedPhotoCount: 6,
      },
      {
        id: 'edge-c3',
        name: 'Una sola foto con fecha completa',
        photoCount: 1,
        lastUpdated: 'hace 1 año',
        recuerdoCount: 1,
        undatedPhotoCount: 0,
        coverPhotoUrl: storybookPhotos.people,
        minDate: { year: 2001, month: 5, day: 4 },
        maxDate: { year: 2001, month: 5, day: 4 },
      },
    ],
    loosePhotos: [
      { id: 'edge-lp1', thumbnailUrl: storybookPhotos.album },
      { id: 'edge-lp2', thumbnailUrl: storybookPhotos.sunset },
      { id: 'edge-lp3', thumbnailUrl: storybookPhotos.beach },
    ],
    personas: [
      { id: 'edge-p1', baulId: 'b1', nickname: storybookEdgeText.longPersonName, status: 'active', role: 'custodio', invitedDate: 'hace 4 años' } as Persona,
      { id: 'edge-p2', baulId: 'b1', nickname: 'Invitada pendiente sin avatar', status: 'pending', role: 'colaborador', invitedDate: 'hace 3 días' } as Persona,
    ],
    recuerdos: [
      { id: 'edge-r1', text: storybookEdgeText.longMemory, userName: storybookEdgeText.longPersonName, createdAt: '2024-08-20T10:00:00Z' } as Recuerdo,
    ],
  },
};
