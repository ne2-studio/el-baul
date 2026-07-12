import React from 'react';
import { ChevronLeft, User } from 'lucide-react';

interface UserProfile {
  photoUrl?: string;
  name: string;
  email: string;
}

interface MiPerfilScreenProps {
  onBack: () => void;
  userProfile: UserProfile;
  onSignOut?: () => void;
}

export function MiPerfilScreen({ onBack, userProfile }: MiPerfilScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-3xl text-foreground">Mi perfil</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-8">
          {/* Profile photo */}
          <div className="flex justify-center mb-6">
            {userProfile.photoUrl ? (
              <img
                src={userProfile.photoUrl}
                alt={userProfile.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                <User className="w-12 h-12 text-primary" />
              </div>
            )}
          </div>

          {/* Name */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif text-foreground mb-2">{userProfile.name}</h2>
            <p className="text-muted-foreground">{userProfile.email}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-6" />

          {/* Info message */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Esta información se toma de tu cuenta de Google.
            </p>
          </div>
        </div>

        {/* Additional info - calm and informative */}
        <div className="mt-6 px-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Tu perfil es visible solo para las personas con las que compartes baúles.
          </p>
        </div>
      </div>
    </div>
  );
}