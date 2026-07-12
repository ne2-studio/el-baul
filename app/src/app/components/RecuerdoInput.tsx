import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SendHorizontal } from 'lucide-react';

interface RecuerdoInputProps {
  photoId: string;
  onSubmit: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

// Prompts rotativos para guiar la reflexión
const PROMPTS = [
  '¿Qué recuerdas de este momento?',
  '¿Qué estaba pasando aquí?',
  '¿Por qué fue especial?',
  '¿Qué sentías en ese momento?',
  '¿Qué pasó justo antes o después?'
];

export function RecuerdoInput({ photoId, onSubmit, onFocus, onBlur }: RecuerdoInputProps) {
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
            : 'rgba(255, 255, 255, 0.10)',
          borderColor: isFocused
            ? 'rgba(198, 123, 92, 0.3)'
            : 'rgba(255, 255, 255, 0.15)'
        }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl overflow-hidden border relative flex items-end"
        style={{ borderWidth: '1px' }}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={currentPrompt}
          className="w-full bg-transparent text-background placeholder:text-background/50 px-4 py-3 resize-none focus:outline-none text-sm leading-relaxed"
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
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onMouseDown={handleButtonClick}
              className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center rounded-full bg-primary/90 hover:bg-primary transition-colors"
              aria-label="Enviar recuerdo"
            >
              <SendHorizontal className="w-4 h-4 text-primary-foreground" />
            </motion.button>
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
