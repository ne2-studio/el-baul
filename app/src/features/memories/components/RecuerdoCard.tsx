import React, { useState, forwardRef } from 'react';
import { motion } from 'motion/react';
import { Pencil, Share2 } from 'lucide-react';
import { Recuerdo } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { Avatar } from '@/design-system/components/data-display/Avatar';
import { RecuerdoEditModal } from '@/features/memories/components/RecuerdoEditModal';

interface RecuerdoCardProps {
  recuerdo: Recuerdo;
  isCompact?: boolean;
  onUserClick?: (personaId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
}

export const RecuerdoCard = forwardRef<HTMLDivElement, RecuerdoCardProps>(
  ({ recuerdo, onUserClick, onShareRecuerdo, onEditRecuerdo }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const userName = recuerdo.isOwn ? 'Yo' : (recuerdo.userName || 'Usuario desconocido');
    const canOpenPersona = !!(recuerdo.personaId && onUserClick);
    const canEdit = !!(recuerdo.isOwn && onEditRecuerdo);

    // Determinar si el texto es largo (aproximadamente más de 3 líneas)
    // Asumiendo ~40 caracteres por línea = 120 caracteres para 3 líneas
    const isLongText = recuerdo.text.length > 150;

    const handleSave = async (text: string) => {
      if (!onEditRecuerdo) return;
      setIsSaving(true);
      try {
        const ok = (await onEditRecuerdo(recuerdo, text)) ?? true;
        if (ok) setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group"
      >
        <div className="flex gap-3 items-start">
          {/* Avatar - siempre visible */}
          <Avatar
            name={userName}
            src={recuerdo.userAvatar}
            initialsVariant="colored"
            onClick={canOpenPersona ? () => onUserClick!(recuerdo.personaId!) : undefined}
            alwaysButton
          />

          <div className="flex-1 min-w-0">
            {/* Texto del recuerdo con truncado y fade */}
            <div className="relative">
              <motion.p
                initial={false}
                animate={{
                  height: isExpanded ? 'auto' : 'auto'
                }}
                className={`text-background text-base leading-relaxed ${
                  !isExpanded && isLongText ? 'line-clamp-3' : ''
                }`}
              >
                {recuerdo.text}
              </motion.p>

              {/* Fade gradient cuando está truncado */}
              {!isExpanded && isLongText && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-foreground/95 to-transparent pointer-events-none" />
              )}
            </div>

            {/* Botón Ver más/menos */}
            {isLongText && (
              <Button variant="plain"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-background/60 hover:text-background/85 text-sm mt-1 transition-colors relative group/more"
              >
                <span className="relative">
                  {isExpanded ? 'Ver menos' : 'Ver más'}
                  {/* Underline sutil */}
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-background/40 group-hover/more:w-full transition-all duration-300" />
                </span>
              </Button>
            )}

            <div className="flex items-center justify-between gap-3 mt-1.5">
              <p className="text-background/35 text-xs">
                {userName}
              </p>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <Button variant="plain"
                    type="button"
                    aria-label="Editar recuerdo"
                    onClick={() => setIsEditing(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-background/45 hover:text-background/80 hover:bg-background/10 transition-colors flex-shrink-0"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                )}
                {onShareRecuerdo && (
                  <Button variant="plain"
                    type="button"
                    aria-label="Compartir recuerdo"
                    onClick={() => onShareRecuerdo(recuerdo)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-background/45 hover:text-background/80 hover:bg-background/10 transition-colors flex-shrink-0"
                  >
                    <Share2 className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <RecuerdoEditModal
            initialText={recuerdo.text}
            isSaving={isSaving}
            onCancel={() => setIsEditing(false)}
            onSave={handleSave}
          />
        )}
      </motion.div>
    );
  }
);
