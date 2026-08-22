import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, Users, Archive, Mail, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Usuarios', icon: Users, path: '/usuarios' },
  { label: 'Baúles', icon: Archive, path: '/baules' },
  { label: 'Comms', icon: Mail, path: '/comms' },
];

export function Layout({ children, onLogout }: LayoutProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Collapsed-by-default drawer shouldn't let the page scroll behind it once opened on mobile.
  useEffect(() => {
    document.body.style.overflow = isNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isNavOpen]);

  const closeNav = () => setIsNavOpen(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-card border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => setIsNavOpen((open) => !open)}
          className="md:hidden -ml-2 p-2 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
          aria-label={isNavOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isNavOpen}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-primary text-base md:text-xl truncate">El Baúl — Backoffice</h1>
      </header>

      <div className="flex flex-1 min-h-0">
        {isNavOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeNav} aria-hidden="true" />
        )}

        <nav
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-out md:static md:z-auto md:w-56 md:translate-x-0 ${
            isNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-border md:hidden">
            <span className="text-primary text-sm">El Baúl</span>
            <button
              onClick={closeNav}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 py-6">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeNav}
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

        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
