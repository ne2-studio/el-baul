import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface Recuerdo {
  id: string;
  text: string;
  sharedUserId?: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  isOwn?: boolean;
}

interface RecuerdoCardProps {
  recuerdo: Recuerdo;
  isCompact?: boolean;
  onUserClick?: (sharedUserId: string) => void;
}

// Helper para generar color basado en nombre
function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary/20 text-primary',
    'bg-blue-500/20 text-blue-300',
    'bg-green-500/20 text-green-300',
    'bg-purple-500/20 text-purple-300',
    'bg-orange-500/20 text-orange-300',
    'bg-pink-500/20 text-pink-300',
  ];

  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

// Helper para obtener iniciales
function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const RecuerdoCard = forwardRef<HTMLDivElement, RecuerdoCardProps>(
  ({ recuerdo, onUserClick }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const userName = recuerdo.isOwn ? 'Yo' : (recuerdo.userName || 'Usuario desconocido');
    const initials = getInitials(userName);
    const colorClass = getAvatarColor(userName);
    const canOpenPersona = !!(recuerdo.sharedUserId && onUserClick);

    // Determinar si el texto es largo (aproximadamente más de 3 líneas)
    // Asumiendo ~40 caracteres por línea = 120 caracteres para 3 líneas
    const isLongText = recuerdo.text.length > 150;

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
          <button
            type="button"
            onClick={canOpenPersona ? () => onUserClick!(recuerdo.sharedUserId!) : undefined}
            disabled={!canOpenPersona}
            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium overflow-hidden ${colorClass} ${canOpenPersona ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
          >
            {recuerdo.userAvatar ? (
              <img
                src={recuerdo.userAvatar}
                alt={userName}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              initials
            )}
          </button>

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
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-background/60 hover:text-background/85 text-sm mt-1 transition-colors relative group/more"
              >
                <span className="relative">
                  {isExpanded ? 'Ver menos' : 'Ver más'}
                  {/* Underline sutil */}
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-background/40 group-hover/more:w-full transition-all duration-300" />
                </span>
              </button>
            )}

            {/* Autor - más sutil debajo */}
            <p className="text-background/35 text-xs mt-1.5">
              {userName}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }
);
