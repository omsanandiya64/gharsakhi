import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * Shared shell for all three role panels. Nav presentation changes by
 * breakpoint per §4.4: bottom tab bar (<768px) -> horizontal top bar
 * (768-1023px) -> left sidebar (>=1024px). `items` stays a single source of
 * truth for the role's nav; only the wrapper (CustomerLayout etc.) differs.
 */
export function PanelLayout({ brand, items }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  const sidebarLinkClass = ({ isActive }) =>
    `flex items-center gap-3 min-h-[48px] px-3 rounded-xl font-semibold text-sm transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
    }`;

  const topBarLinkClass = ({ isActive }) =>
    `flex items-center gap-2 min-h-[48px] px-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-colors ${
      isActive ? 'bg-gs-teal-100 text-gs-teal-600' : 'text-gs-muted hover:bg-gs-teal-100/60'
    }`;

  const bottomTabClass = ({ isActive }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-xs font-semibold ${
      isActive ? 'text-gs-teal-600' : 'text-gs-muted'
    }`;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gs-sand">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-gs-teal-900 text-white">
        <div className="p-6">
          <span className="font-display text-xl font-bold">GharSakhi</span>
          <p className="text-xs text-white/60 mt-1">{brand}</p>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3" aria-label="Main navigation">
          {items.map(({ path, end, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={end} className={sidebarLinkClass}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 min-h-[48px] w-full px-3 rounded-xl font-semibold text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={20} aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gs-teal-100 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-display text-lg font-bold text-gs-teal-900">GharSakhi</span>
            <p className="text-xs text-gs-muted">{brand}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full hover:bg-gs-teal-100 text-gs-teal-900"
          >
            <LogOut size={20} aria-hidden="true" />
          </button>
        </header>

        <nav
          aria-label="Main navigation"
          className="hidden md:flex lg:hidden items-center gap-1 bg-white border-b border-gs-teal-100 px-4 py-2 overflow-x-auto"
        >
          {items.map(({ path, end, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={end} className={topBarLinkClass}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-6">
          <Outlet />
        </main>

        <nav
          aria-label="Main navigation"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gs-teal-100 flex"
        >
          {items.map(({ path, end, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={end} className={bottomTabClass}>
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
