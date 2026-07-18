import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { ROUTES } from '../config/routes';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Menu, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';

export const Header: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const [showIdCard, setShowIdCard] = useState(false);

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
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-6 flex items-center justify-between relative z-20">
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
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIdCard(true)}
              className="flex items-center space-x-1.5 text-xs border-indigo-500/30 hover:border-indigo-500 text-indigo-400 bg-indigo-600/5 hover:bg-indigo-600/10 cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">My ID Card</span>
            </Button>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-400">
                Logged in: <span className="text-indigo-400">{branchName}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {user.employeeId}
              </p>
            </div>
          </>
        )}

        <ThemeToggle />
      </div>

      {/* Digital ID Card Dialog */}
      <Dialog isOpen={showIdCard} onClose={() => setShowIdCard(false)} title="Digital Staff ID Card">
        {user && (
          <div className="flex flex-col items-center justify-center p-4 text-slate-200">
            {/* The ID Card Container */}
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
              {/* Card top banner */}
              <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <div className="p-6 flex flex-col items-center text-center space-y-4">
                {/* Header branding */}
                <div>
                  <h3 className="text-sm font-extrabold tracking-wider text-slate-400 uppercase">ARSHI ENTERPRISE</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Staff Identity Card</p>
                </div>

                {/* Avatar / Profile Initial */}
                <div className="h-16 w-16 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30 text-2xl uppercase">
                  {user.firstName[0]}
                </div>

                {/* Staff Details */}
                <div>
                  <h4 className="text-base font-bold text-slate-100">{`${user.firstName} ${user.lastName}`}</h4>
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mt-0.5">{user.role.replace('_', ' ')}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Employee ID: {user.employeeId}</p>
                </div>

                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-lg shadow-inner flex items-center justify-center">
                  <QRCode 
                    value={user.qrCode || user.employeeId} 
                    size={140}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>

                <div className="text-[9px] text-slate-500 font-medium">
                  Scan this code at security checkpoints for entry/exit clearance
                </div>
              </div>
            </div>

            <Button onClick={() => setShowIdCard(false)} className="mt-5 w-full max-w-sm">
              Close ID Card
            </Button>
          </div>
        )}
      </Dialog>
    </header>
  );
};
