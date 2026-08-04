import { describe, expect, it } from 'vitest';
import { useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  it('reset clears weeklyDigestEnabled back to null', () => {
    useAuthStore.setState({ weeklyDigestEnabled: true });

    useAuthStore.getState().reset();

    expect(useAuthStore.getState().weeklyDigestEnabled).toBeNull();
  });
});
