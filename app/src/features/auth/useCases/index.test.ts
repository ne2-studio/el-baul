// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { resetAllStores } from './index';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { useCurrentBaulStore } from '@/store/useCurrentBaulStore';
import { Photo } from '@/types';

describe('resetAllStores', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears domain stores but keeps the remembered current baúl', () => {
    useAuthStore.getState().setUserProfile({ photoUrl: '', name: 'Ana', email: 'ana@example.com' });
    useBaulesStore.setState({ baules: [{ id: 'baul-1' } as never] });
    usePhotosStore.getState().upsertPhotos([new Photo({
      id: 'photo-1', baulId: 'baul-1', thumbnailUrl: 'thumb', fullUrl: 'full',
      uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0,
    })]);
    useCurrentBaulStore.getState().setCurrentBaulId('baul-1');

    resetAllStores();

    expect(useAuthStore.getState().userProfile).toEqual({ photoUrl: '', name: '', email: '' });
    expect(useBaulesStore.getState().baules).toEqual([]);
    expect(usePhotosStore.getState().photosById).toEqual({});
    // El workspace recordado sobrevive a un cierre de sesión — ver comentario en
    // useCurrentBaulStore.ts: la app debe reabrir en el último baúl usado tras volver a
    // iniciar sesión, no perderlo en cada logout.
    expect(useCurrentBaulStore.getState().currentBaulId).toBe('baul-1');
    expect(localStorage.getItem('elbaul.currentBaulId')).toBe('baul-1');
  });
});
