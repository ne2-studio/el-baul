import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';

interface RecuerdoInputProps {
  photoId: string;
  onSubmit: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  // 'dark' (por defecto) para overlays sobre foto como PhotoViewer; 'light' para contextos con
  // fondo normal de página como WriteMemorySuggestionScreen — sin esto el texto y el borde
  // quedan en tonos claros sobre claro, invisibles.
  theme?: 'dark' | 'light';
}

// Prompts rotativos para guiar la reflexión
const PROMPTS = [
  '¿Qué recuerdas de este momento?',
  '¿Qué estaba pasando aquí?',
  '¿Por qué fue especial?',
  '¿Qué sentías en ese momento?',
  '¿Qué pasó justo antes o después?'
];

export function RecuerdoInput({ photoId, onSubmit, onFocus, onBlur, theme = 'dark' }: RecuerdoInputProps) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Cambiar el prompt cada vez que cambia la foto
  useEffect(() => {
    setCurrentPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, [photoId]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');

      // Mostrar feedback sutil
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 2000);

      // Quitar foco
      inputRef.current?.blur();
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevenir que el textarea pierda el foco
    handleSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter sin shift = enviar (útil en desktop)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 80)}px`;
    }
  }, [text]);

  const hasText = text.trim().length > 0;

  return (
    <div className="relative">
      <motion.div
        initial={false}
        animate={{
          backgroundColor: isFocused
            ? 'rgba(198, 123, 92, 0.12)'
            : theme === 'light' ? 'rgba(58, 50, 48, 0.03)' : 'rgba(255, 255, 255, 0.10)',
          borderColor: isFocused
            ? 'rgba(198, 123, 92, 0.3)'
            : theme === 'light' ? 'rgba(58, 50, 48, 0.12)' : 'rgba(255, 255, 255, 0.15)'
        }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl overflow-hidden border relative flex items-end"
        style={{ borderWidth: '1px' }}
      >
        <Input
          inputRef={inputRef}
          multiline
          variant={theme === 'light' ? 'photoViewerMemoryLight' : 'photoViewerMemory'}
          value={text}
          onChange={setText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={currentPrompt}
          className="flex-1"
          rows={1}
          style={{
            minHeight: '44px',
            maxHeight: '80px',
            paddingRight: hasText ? '48px' : '16px' // Espacio para el botón
          }}
        />

        {/* Botón de enviar inline */}
        <AnimatePresence>
          {hasText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute right-2 bottom-2"
            >
              <Button
                variant="primary"
                iconOnly
                onMouseDown={handleButtonClick}
                className="h-8 w-8 rounded-full bg-primary/90 hover:bg-primary"
                aria-label="Enviar recuerdo"
              >
                <SendHorizontal className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Feedback sutil al guardar */}
      <AnimatePresence>
        {showSavedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background/90 text-foreground text-xs px-3 py-1.5 rounded-full shadow-lg"
          >
            Guardado
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
