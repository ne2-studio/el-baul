import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoStack } from '@/design-system/patterns/media/PhotoStack';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Patterns/Media/PhotoStack',
  component: PhotoStack,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Up to 3 real photo thumbnails, fanned and overlapping, as a compact stand-in for "a bunch of photos" — without listing or counting every one of them.

### When to use
Use wherever the app needs to represent a batch or collection of photos at a glance: onboarding InvitePreview illustrations, an upload-progress screen, a fallback cover. Renders fewer slots instead of leaving a gap when given fewer than 3 photos.

### When NOT to use
Do not use where the identity of every individual photo matters (a grid the user needs to review, tap or select); use a real grid/list pattern there instead.

### Typical examples
\`OnboardingInvitePreviewIllustrations\` uses it both for the settled state of its scattered-icons animation and as a cover fallback. \`UploadingScreen\` uses it to preview a batch being uploaded.

### Common mistakes
Passing more than 3 photos expecting them all to render — only the first 3 are shown, by design.

### Related components
\`PhotoStage\` for a single full-screen photo instead of a compact stack.
`,
      },
    },
  },
} satisfies Meta<typeof PhotoStack>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos = [storybookPhotos.beach, storybookPhotos.album, storybookPhotos.sunset];

export const Default: Story = {
  args: {
    photos,
  },
};

export const FewerThanThreePhotos: Story = {
  args: {
    photos: photos.slice(0, 1),
  },
};

export const MoreThanThreePhotos: Story = {
  args: {
    photos: [...photos, storybookPhotos.people, storybookPhotos.landscape],
  },
};
