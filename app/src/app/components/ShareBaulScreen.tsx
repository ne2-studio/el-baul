import React, { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Baul } from './BaulesList';
import { BaulRole, getRoleDisplayName, getRoleDescription } from '../App';

interface ShareBaulScreenProps {
  baul: Baul;
  onBack: () => void;
  onSendInvitation: (email: string, role: BaulRole) => void;
}

export function ShareBaulScreen({ baul, onBack, onSendInvitation }: ShareBaulScreenProps) {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [selectedRole, setSelectedRole] = useState<BaulRole>('miembro');

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValid(validateEmail(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSendInvitation(email, selectedRole);
      setEmail('');
      setIsValid(false);
      setSelectedRole('miembro');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-serif text-gray-900">Compartir baúl</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        {/* Baul info */}
        <div className="mb-6">
          <h2 className="font-serif text-xl text-gray-900 mb-1">{baul.name}</h2>
          {baul.description && (
            <p className="text-sm text-gray-600">{baul.description}</p>
          )}
        </div>

        {/* Intro text */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">
            Invita a personas de confianza para que puedan ver este baúl.
          </p>
        </div>

        {/* Invitation form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="nombre@ejemplo.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-sm text-gray-700 mb-3">
              Nivel de acceso
            </label>
            <div className="space-y-3">
              {/* Colaborador option */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="colaborador"
                  checked={selectedRole === 'colaborador'}
                  onChange={(e) => setSelectedRole(e.target.value as BaulRole)}
                  className="mt-0.5 w-4 h-4 text-primary focus:ring-primary/20"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Colaborador</div>
                  <div className="text-sm text-gray-600 mt-0.5">Puede añadir fotos</div>
                </div>
              </label>
              
              {/* Miembro option */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="miembro"
                  checked={selectedRole === 'miembro'}
                  onChange={(e) => setSelectedRole(e.target.value as BaulRole)}
                  className="mt-0.5 w-4 h-4 text-primary focus:ring-primary/20"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Miembro</div>
                  <div className="text-sm text-gray-600 mt-0.5">Solo ver</div>
                </div>
              </label>
            </div>
          </div>

          {/* Helper text */}
          <div className="bg-cream/30 rounded-lg p-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Podrás cambiar o revocar este acceso en cualquier momento.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={!isValid}
              className="w-full bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-full font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              <Send className="w-4 h-4" />
              Enviar invitación
            </button>
            
            <button
              type="button"
              onClick={onBack}
              className="w-full text-gray-600 py-3 px-6 font-medium hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}