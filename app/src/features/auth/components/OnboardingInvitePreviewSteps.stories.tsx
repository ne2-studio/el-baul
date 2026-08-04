import type { Meta, StoryObj } from '@storybook/react-vite';
import { OnboardingCarousel } from '@/features/auth/components/OnboardingCarousel';
import { buildInvitePreviewSteps } from '@/features/auth/components/OnboardingInvitePreviewSteps';
import { BaulInviteLinkPreview } from '@/types';
import { storybookAvatars, storybookPhotos } from '@/storybook/fixtures';

interface StoryArgs {
  preview: BaulInviteLinkPreview;
  onComplete: () => void;
  onSkip: () => void;
}

const meta = {
  title: 'Screens/Onboarding/InvitePreview',
  render: ({ preview, onComplete, onSkip }) => (
    <OnboardingCarousel steps={buildInvitePreviewSteps(preview)} onComplete={onComplete} onSkip={onSkip} />
  ),
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const fullPreview: BaulInviteLinkPreview = {
  baulId: 'baul-1',
  name: 'Familia García',
  description: undefined,
  previewPhotos: [storybookPhotos.familyCover, storybookPhotos.beach, storybookPhotos.album],
  coverPhotoUrl: storybookPhotos.familyCover,
  personaAvatarUrls: [storybookAvatars.abuela, storybookAvatars.abuela, storybookAvatars.abuela],
};

export const FullContent: Story = {
  args: {
    preview: fullPreview,
    onComplete: () => alert('onComplete clicked'),
    onSkip: () => alert('onSkip clicked'),
  },
};

export const NoCoverPhoto: Story = {
  args: {
    preview: { ...fullPreview, coverPhotoUrl: undefined },
    onComplete: () => alert('onComplete clicked'),
    onSkip: () => alert('onSkip clicked'),
  },
};

export const NoRealContentYet: Story = {
  name: 'Sin fotos ni avatares (degradación elegante)',
  args: {
    preview: { ...fullPreview, previewPhotos: [], coverPhotoUrl: undefined, personaAvatarUrls: [] },
    onComplete: () => alert('onComplete clicked'),
    onSkip: () => alert('onSkip clicked'),
  },
};
