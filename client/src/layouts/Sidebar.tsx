import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { ROUTES } from '../config/routes';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Warehouse,
  ArrowRightLeft,
  ShieldCheck,
  ScrollText,
  MapPin,
  FileSpreadsheet,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  if (!user) return null;

  const role = user.role;

  // Build nav items dynamically based on role
  const navItems = [
    {
      label: 'Dashboard',
      path: ROUTES.DASHBOARD,
      icon: LayoutDashboard,
      roles: ['super_admin', 'branch_admin', 'store_manager', 'security_guard', 'staff']
    },
    {
      label: 'Branches',
      path: ROUTES.BRANCHES,
      icon: Building2,
      roles: ['super_admin']
    },
    {
      label: 'Staff Members',
      path: ROUTES.STAFF,
      icon: Users,
      roles: ['super_admin']
    },
    {
      label: 'Products',
      path: ROUTES.PRODUCTS,
      icon: Package,
      roles: ['super_admin', 'branch_admin', 'store_manager']
    },
    {
      label: 'Inventory Control',
      path: ROUTES.INVENTORY,
      icon: Warehouse,
      roles: ['super_admin', 'branch_admin', 'store_manager']
    },
    {
      label: 'Transfers',
      path: ROUTES.TRANSFERS,
      icon: ArrowRightLeft,
      roles: ['super_admin', 'branch_admin', 'store_manager', 'staff']
    },
    {
      label: 'Security Gate',
      path: ROUTES.SECURITY,
      icon: ShieldCheck,
      roles: ['super_admin', 'branch_admin', 'security_guard']
    },
    {
      label: 'Branch Receiving',
      path: ROUTES.RECEIVING,
      icon: Warehouse,
      roles: ['super_admin', 'branch_admin', 'store_manager']
    },
    {
      label: 'Audit Trail',
      path: ROUTES.AUDIT,
      icon: ScrollText,
      roles: ['super_admin']
    },
    {
      label: 'Live Staff Tracking',
      path: ROUTES.TRACKING,
      icon: MapPin,
      roles: ['super_admin', 'branch_admin']
    },
    {
      label: 'Duty Reports',
      path: ROUTES.TRACKING_REPORTS,
      icon: FileSpreadsheet,
      roles: ['super_admin', 'branch_admin']
    }
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <div
      className={cn(
        "h-screen bg-card text-card-foreground border-r border-border flex flex-col justify-between transition-all duration-300 fixed md:relative inset-y-0 left-0 z-40 shadow-2xl md:shadow-none",
        sidebarOpen ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"
      )}
    >
      <div>
        {/* Header Branding */}
        <div className="h-16 flex items-center px-4 border-b border-border justify-between">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-md shadow-indigo-600/25">
              AE
            </div>
            {sidebarOpen && (
              <span className="font-extrabold text-sm tracking-tight text-foreground whitespace-nowrap">
                Arshi Enterprise
              </span>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group relative",
                  isActive
                    ? "bg-indigo-600/10 text-indigo-500 dark:text-indigo-400 border-l-2 border-indigo-500 rounded-l-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
              {!sidebarOpen && (
                <div className="absolute left-16 bg-popover text-popover-foreground border border-border px-2 py-1 text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Footer Profile & Collapse Toggle */}
      <div className="p-3 border-t border-border space-y-2">
        {sidebarOpen && user && (
          <div className="flex items-center space-x-3 p-2 bg-muted/40 rounded-lg border border-border">
            <div className="h-9 w-9 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30 uppercase">
              {user.firstName[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-foreground truncate">{`${user.firstName} ${user.lastName}`}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg cursor-pointer hidden md:flex"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
