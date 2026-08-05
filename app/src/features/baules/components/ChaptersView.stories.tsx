import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChaptersView } from '@/features/baules/components/ChaptersView';
import { Baul, Chapter } from '@/types';
import { storybookEdgeText, storybookPhotos } from '@/storybook/fixtures';
import { viewportGlobals } from '@/storybook/viewports';
import { withRouter } from '@/storybook/withRouter';

// Personas/Recuerdos tab content and the baúl settings "···" menu moved into
// PersonasTabContainer/RecuerdosTabContainer/BaulSettingsMenuContainer (features/people,
// features/memories, features/baules) — self-sufficient components that read their own
// Zustand store slice and self-navigate. BaulSettingsMenuContainer in particular sits in the
// header, so it's mounted unconditionally on every render (unlike the tab containers, which
// only mount when their tab is selected) — this story needs a bare MemoryRouter just to
// satisfy its useNavigate() call, no route matching or store data involved. Their actual
// behavior is covered by Vitest+RTL tests colocated with each container, and end to end by
// app/acceptance-tests/{personas,recuerdos,global-invite-link}.spec.ts. This story now only
// exercises what ChaptersView still owns directly: the chapter grid and header.
const meta = {
  title: 'Screens/Baul/BaulDetail',
  component: ChaptersView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [withRouter],
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

const sharedDefaults = {
  baul,
  chapters,
  personasCount: 2,
  recuerdosCount: 1,
  onBack: () => alert('onBack clicked'),
  onSelectChapter: (chapter: Chapter) => alert(`onSelectChapter: ${chapter.name}`),
  onCreateChapter: () => alert('onCreateChapter clicked'),
  onOpenLoosePhotos: () => alert('onOpenLoosePhotos clicked'),
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
    personasCount: 0,
    recuerdosCount: 0,
  },
};

export const ReadOnlyCollaborator: Story = {
  args: {
    ...sharedDefaults,
    baul: { ...baul, isCustodio: false, role: 'colaborador' },
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
  },
};
