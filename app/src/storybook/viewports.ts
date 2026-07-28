export const storybookViewportKeys = {
  mobile: 'elbaul-mobile',
  narrow: 'elbaul-narrow',
  desktop: 'elbaul-desktop',
} as const;

export const storybookViewports = {
  [storybookViewportKeys.mobile]: {
    name: 'El Baul mobile - 390px',
    styles: { width: '390px', height: '844px' },
    type: 'mobile',
  },
  [storybookViewportKeys.narrow]: {
    name: 'El Baul narrow - 700px',
    styles: { width: '700px', height: '900px' },
    type: 'tablet',
  },
  [storybookViewportKeys.desktop]: {
    name: 'El Baul desktop - 1280px',
    styles: { width: '1280px', height: '900px' },
    type: 'desktop',
  },
} as const;

export const viewportGlobals = {
  mobile: { viewport: { value: storybookViewportKeys.mobile } },
  narrow: { viewport: { value: storybookViewportKeys.narrow } },
  desktop: { viewport: { value: storybookViewportKeys.desktop } },
} as const;
