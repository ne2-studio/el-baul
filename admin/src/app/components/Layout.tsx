import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, Users, Archive } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Usuarios', icon: Users, path: '/usuarios' },
  { label: 'Baúles', icon: Archive, path: '/baules' },
];

export function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-primary">El Baúl — Backoffice</h1>
      </header>

      <div className="flex flex-1">
        <nav className="w-56 bg-card border-r border-border flex flex-col">
          <div className="flex-1 py-6">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `mx-3 mb-1 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="p-3 border-t border-border">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </nav>

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
