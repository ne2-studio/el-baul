import { NavLink, Route, Routes } from 'react-router-dom';
import { EmailsListRoute } from './EmailsListRoute';
import { PushListRoute } from './PushListRoute';

// No prior tab pattern existed in admin (every other section is a single flat route) — this
// introduces one, driven by sub-routes rather than local state, so a direct link/refresh to
// /comms/push lands on the right tab and each tab keeps its own store instance intact.
const tabs = [
  { label: 'Emails', path: '/comms', end: true },
  { label: 'Push', path: '/comms/push', end: false },
];

export function CommsRoute() {
  return (
    <div className="space-y-6">
      <h2>Comms</h2>

      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              `px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<EmailsListRoute />} />
        <Route path="push" element={<PushListRoute />} />
      </Routes>
    </div>
  );
}
