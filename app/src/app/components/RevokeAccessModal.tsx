import React from 'react';
import { X, Loader2 } from 'lucide-react';

interface RevokeAccessModalProps {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function RevokeAccessModal({ userName, onConfirm, onCancel, isSubmitting = false }: RevokeAccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif text-gray-900">Quitar acceso</h2>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">
            <span className="font-medium">{userName}</span> dejará de ver el contenido de este baúl.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Quitar acceso
          </button>
        </div>
      </div>
    </div>
  );
}
