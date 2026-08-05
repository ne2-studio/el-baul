import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Storybook decorator for components under features/*/components/** that read
// react-router-dom hooks (e.g. useNavigate() inside a features/*/containers/* they render) —
// those files can't import react-router-dom directly (componentBoundaryRule in
// eslint.config.js), so the story imports this helper instead. No route matching or store
// data involved, just a bare Router context to satisfy the hook.
export function withRouter(Story: () => React.ReactElement) {
  return <MemoryRouter>{Story()}</MemoryRouter>;
}
