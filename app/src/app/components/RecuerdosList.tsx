import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RecuerdoCard, Recuerdo } from './RecuerdoCard';

interface RecuerdosListProps {
  recuerdos: Recuerdo[];
  maxVisibleWhenCollapsed?: number;
  onUserClick?: (sharedUserId: string) => void;
}

export function RecuerdosList({
  recuerdos,
  maxVisibleWhenCollapsed = 2,
  onUserClick
}: RecuerdosListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (recuerdos.length === 0) {
    return null;
  }

  const visibleRecuerdos = isExpanded
    ? recuerdos
    : recuerdos.slice(0, maxVisibleWhenCollapsed);

  const hiddenCount = recuerdos.length - maxVisibleWhenCollapsed;
  const shouldShowExpandButton = hiddenCount > 0;

  return (
    <div className="space-y-5">
      {/* Lista de recuerdos */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {visibleRecuerdos.map((recuerdo, index) => (
            <RecuerdoCard
              key={recuerdo.id}
              recuerdo={recuerdo}
              onUserClick={onUserClick}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Botón para expandir/colapsar - interactivo */}
      {shouldShowExpandButton && (
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-background/60 hover:text-background/85 text-sm transition-colors group relative"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative">
            {isExpanded ? (
              'Ver menos'
            ) : (
              <>
                +{hiddenCount} {hiddenCount === 1 ? 'recuerdo más' : 'recuerdos más'}
              </>
            )}
            {/* Underline sutil al hover */}
            <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-background/40 group-hover:w-full transition-all duration-300" />
          </span>
        </motion.button>
      )}
    </div>
  );
}
