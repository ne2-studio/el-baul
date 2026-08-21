import { HardDrive, Image as ImageIcon, MessageCircle, Smartphone, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { PhotoStack } from '@/design-system/patterns/media/PhotoStack';
import { TrunkReadyIllustration } from '@/features/auth/components/OnboardingCarousel';

export function InvitePreviewPhotosIllustration({ photos }: { photos: string[] }) {
  const scattered = [
    { Icon: MessageCircle, x: -64, y: -40 },
    { Icon: ImageIcon, x: 64, y: -40 },
    { Icon: HardDrive, x: -64, y: 40 },
    { Icon: Smartphone, x: 64, y: 40 },
  ];

  return (
    <div className="relative h-40 flex items-center justify-center">
      {scattered.map(({ Icon, x, y }, i) => (
        <motion.div
          key={i}
          className="absolute w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
          initial={{ x, y, opacity: 0.9 }}
          animate={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
          transition={{ duration: 1.6, delay: 0.4, ease: 'easeInOut' }}
        >
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </motion.div>
      ))}
      {photos.length > 0 ? (
        <PhotoStack photos={photos} startDelay={1.2} />
      ) : (
        <motion.div
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <ImageIcon className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </motion.div>
      )}
    </div>
  );
}

export function InvitePeopleIllustration({ avatarUrls }: { avatarUrls: string[] }) {
  const slots = [avatarUrls[0], avatarUrls[1], avatarUrls[2]];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6">
        {slots.map((url, i) => (
          <motion.div
            key={i}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70 overflow-hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
          >
            {url ? (
              <img src={url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-5 h-5" strokeWidth={1.5} />
            )}
          </motion.div>
        ))}
      </div>
      <motion.div
        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <BaulIcon className="w-8 h-8 text-primary" />
      </motion.div>
    </div>
  );
}

export function InviteMemoryTimelineIllustration({ photos }: { photos: string[] }) {
  const slots = [photos[0], photos[1], photos[2]];

  return (
    <div className="relative flex items-center justify-center gap-4 h-32">
      <div className="absolute top-1/2 left-10 right-10 h-px bg-border" />
      {slots.map((url, i) => (
        <motion.div
          key={i}
          className="relative z-10 w-16 h-16 rounded-xl overflow-hidden border-2 border-card shadow-sm bg-muted flex items-center justify-center text-muted-foreground"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.2 }}
        >
          {url ? (
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5" strokeWidth={1.5} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function InviteCoverIllustration({
  coverPhotoUrl,
  fallbackPhotos
}: {
  coverPhotoUrl?: string;
  fallbackPhotos: string[];
}) {
  if (coverPhotoUrl) {
    return (
      <div className="flex justify-center">
        <motion.div
          className="w-40 h-40 rounded-3xl overflow-hidden shadow-sm"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <img src={coverPhotoUrl} alt="" className="w-full h-full object-cover" />
        </motion.div>
      </div>
    );
  }

  if (fallbackPhotos.length === 0) return <TrunkReadyIllustration />;

  return (
    <div className="flex justify-center">
      <PhotoStack photos={fallbackPhotos} />
    </div>
  );
}
