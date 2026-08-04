import { describe, expect, it, vi } from 'vitest';
import type { Location, NavigateFunction } from 'react-router-dom';
import {
  closePhotoViewer,
  getBackgroundLocation,
  navigateToPhotoInViewer,
  openPhotoViewer,
  photoViewerPath,
} from './index';

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    pathname: '/baules/baul-1/capitulos/chapter-1',
    search: '',
    hash: '',
    state: null,
    key: 'default',
    ...overrides,
  };
}

describe('viewerNavigation', () => {
  describe('getBackgroundLocation', () => {
    it('returns undefined when there is no state', () => {
      expect(getBackgroundLocation(makeLocation())).toBeUndefined();
    });

    it('returns the backgroundLocation carried in state', () => {
      const background = makeLocation({ pathname: '/baules/baul-1' });
      expect(getBackgroundLocation(makeLocation({ state: { backgroundLocation: background } }))).toBe(background);
    });
  });

  describe('photoViewerPath', () => {
    it('appends /foto/:photoId to the base path', () => {
      expect(photoViewerPath('/baules/baul-1/capitulos/chapter-1', 'photo-1')).toBe(
        '/baules/baul-1/capitulos/chapter-1/foto/photo-1'
      );
    });
  });

  describe('openPhotoViewer', () => {
    it('navigates to the path carrying the current location as backgroundLocation', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;
      const location = makeLocation({ pathname: '/baules/baul-1/capitulos/chapter-1' });

      openPhotoViewer(navigate, location, '/baules/baul-1/capitulos/chapter-1/foto/photo-1');

      expect(navigate).toHaveBeenCalledWith('/baules/baul-1/capitulos/chapter-1/foto/photo-1', {
        state: { backgroundLocation: location },
      });
    });
  });

  describe('closePhotoViewer', () => {
    it('goes back when there is a backgroundLocation', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;

      closePhotoViewer(navigate, makeLocation(), '/baules/baul-1/capitulos/chapter-1');

      expect(navigate).toHaveBeenCalledWith(-1);
    });

    it('replaces with the fallback path when there is no backgroundLocation', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;

      closePhotoViewer(navigate, undefined, '/baules/baul-1/capitulos/chapter-1');

      expect(navigate).toHaveBeenCalledWith('/baules/baul-1/capitulos/chapter-1', { replace: true });
    });
  });

  describe('navigateToPhotoInViewer', () => {
    it('carries the backgroundLocation forward when present', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;
      const background = makeLocation();

      navigateToPhotoInViewer(navigate, background, '/baules/baul-1/capitulos/chapter-1/foto/photo-2');

      expect(navigate).toHaveBeenCalledWith('/baules/baul-1/capitulos/chapter-1/foto/photo-2', {
        replace: true,
        state: { backgroundLocation: background },
      });
    });

    it('navigates without state when there is no backgroundLocation', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;

      navigateToPhotoInViewer(navigate, undefined, '/baules/baul-1/capitulos/chapter-1/foto/photo-2');

      expect(navigate).toHaveBeenCalledWith('/baules/baul-1/capitulos/chapter-1/foto/photo-2', {
        replace: true,
        state: undefined,
      });
    });
  });
});
