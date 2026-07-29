import React from 'react';
import { User } from 'lucide-react';
import { Notice } from '@/design-system/components/feedback/Notice';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';

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
      <PageHeader variant="inline" onBack={onBack} title="Mi perfil" />

      {/* Content */}
      <PageContainer className="py-8">
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
          <Notice align="center">
            Esta información se toma de tu cuenta de Google.
          </Notice>
        </div>

        {/* Additional info - calm and informative */}
        <div className="mt-6 px-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Tu perfil es visible solo para las personas con las que compartes baúles.
          </p>
        </div>
      </PageContainer>
    </div>
  );
}