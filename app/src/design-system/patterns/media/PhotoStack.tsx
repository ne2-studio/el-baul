import { motion } from 'motion/react';

interface PhotoStackProps {
  photos: string[];
  startDelay?: number;
}

// Up to 3 real photo thumbnails, fanned and overlapping. Used both by the onboarding
// InvitePreview illustrations (as the "settled" state of the scattered-icons animation and the
// cover fallback) and by the upload-progress screen (a static preview of the batch being
// uploaded) — a caller with fewer than 3 photos just renders fewer slots instead of leaving a
// gap.
export function PhotoStack({ photos, startDelay = 0 }: PhotoStackProps) {
  const slots = photos.slice(0, 3);
  const offsets = [-16, 0, 16];
  const rotations = [-6, 0, 6];

  return (
    <div className="relative w-24 h-20">
      {slots.map((url, i) => (
        <motion.div
          key={url}
          className="absolute top-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-card shadow-sm bg-muted flex items-center justify-center text-muted-foreground"
          style={{ left: `calc(50% + ${offsets[i]}px - 2rem)`, zIndex: i }}
          initial={{ opacity: 0, scale: 0.7, rotate: rotations[i] }}
          animate={{ opacity: 1, scale: 1, rotate: rotations[i] }}
          transition={{ duration: 0.5, delay: startDelay + i * 0.15 }}
        >
          <img src={url} alt="" className="w-full h-full object-cover" />
        </motion.div>
      ))}
    </div>
  );
}
