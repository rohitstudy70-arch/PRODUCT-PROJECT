import React from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { ROUTES } from '../config/routes';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/button';
import { Menu } from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { toggleSidebar } = useUIStore();

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === ROUTES.DASHBOARD) return 'Home / Dashboard';
    if (path.startsWith(ROUTES.BRANCHES)) return 'Home / Branches';
    if (path.startsWith(ROUTES.STAFF)) return 'Home / Staff Members';
    if (path.startsWith(ROUTES.PRODUCTS)) return 'Home / Products';
    if (path.startsWith(ROUTES.INVENTORY)) return 'Home / Inventory';
    if (path.startsWith(ROUTES.TRANSFERS)) return 'Home / Asset Transfers';
    if (path.startsWith(ROUTES.SECURITY)) return 'Home / Security Gate';
    if (path.startsWith(ROUTES.RECEIVING)) return 'Home / Branch Receiving';
    if (path.startsWith(ROUTES.AUDIT)) return 'Home / Audit Log Trail';
    return 'Home';
  };

  const branchName = user?.branchId ? user.branchId.name : 'Central Head Office';

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between relative z-20">
      {/* Left Breadcrumbs & location */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden text-slate-400 hover:text-slate-100 mr-3"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
            {getBreadcrumbs()}
          </p>
        </div>
      </div>

      {/* Right User metadata + Settings */}
      <div className="flex items-center space-x-4">
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-400">
              Logged in: <span className="text-indigo-400">{branchName}</span>
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {user.employeeId}
            </p>
          </div>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
};
