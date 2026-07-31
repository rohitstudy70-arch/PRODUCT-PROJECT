import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { ROUTES } from '../config/routes';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Menu, QrCode, Scan, CreditCard } from 'lucide-react';
import QRCode from 'react-qr-code';
import { UniversalProductScannerModal } from '../components/shared/UniversalProductScannerModal';
import { StaffRFIDTerminalModal } from '../components/shared/StaffRFIDTerminalModal';

export const Header: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const [showIdCard, setShowIdCard] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showStaffRfidModal, setShowStaffRfidModal] = useState(false);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === ROUTES.DASHBOARD) return 'Home › Dashboard';
    if (path.startsWith(ROUTES.BRANCHES)) return 'Home › Branches';
    if (path.startsWith(ROUTES.STAFF)) return 'Home › Staff Members';
    if (path.startsWith(ROUTES.PRODUCTS)) return 'Home › Products';
    if (path.startsWith(ROUTES.INVENTORY)) return 'Home › Inventory';
    if (path.startsWith(ROUTES.TRANSFERS)) return 'Home › Asset Transfers';
    if (path.startsWith(ROUTES.SECURITY)) return 'Home › Security Gate';
    if (path.startsWith(ROUTES.RECEIVING)) return 'Home › Branch Receiving';
    if (path.startsWith(ROUTES.AUDIT)) return 'Home › Audit Log Trail';
    return 'Home';
  };

  const branchName = user?.role === 'super_admin' 
    ? 'Central Head Office (Main Admin)' 
    : user?.branchId ? user.branchId.name : 'Central Head Office';

  return (
    <header className="h-16 gradient-border-b bg-card/40 backdrop-blur-md px-6 flex items-center justify-between relative z-20">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-slate-100 mr-3" title="Open Menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
            {getBreadcrumbs()}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {user && (
          <>
            {user.dutyStatus === 'ON_DUTY' && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE DUTY GPS ON</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowStaffRfidModal(true)} className="flex items-center space-x-1.5 text-xs border-indigo-500/50 hover:border-indigo-400 text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/60 cursor-pointer shadow-sm glow-indigo" title="Scan Staff RFID Smart Card for Attendance & Duty">
              <CreditCard className="h-4 w-4 text-indigo-400 animate-pulse" />
              <span className="hidden sm:inline font-bold">Staff RFID</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowScannerModal(true)} className="flex items-center space-x-1.5 text-xs border-slate-700 hover:border-slate-600 text-slate-300 bg-slate-900/60 hover:bg-slate-800 cursor-pointer" title="Scan any Barcode, IMEI, Serial No">
              <Scan className="h-4 w-4 text-slate-400" />
              <span className="hidden sm:inline font-bold">Scan Product</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowIdCard(true)} className="flex items-center space-x-1.5 text-xs border-indigo-500/30 hover:border-indigo-500 text-indigo-400 bg-indigo-600/5 hover:bg-indigo-600/10 cursor-pointer">
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

      <Dialog isOpen={showIdCard} onClose={() => setShowIdCard(false)} title="Digital Staff ID Card">
        {user && (
          <div className="flex flex-col items-center justify-center p-4 text-slate-200">
            <div className="w-full max-w-sm glass-card-premium rounded-xl overflow-hidden shadow-2xl relative">
              <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="p-6 flex flex-col items-center text-center space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold tracking-wider text-slate-400 uppercase">ARSHI ENTERPRISE</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Staff Identity Card</p>
                </div>
                <div className="h-16 w-16 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30 text-2xl uppercase">
                  {user.firstName[0]}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100">{`${user.firstName} ${user.lastName}`}</h4>
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mt-0.5">{user.role.replace('_', ' ')}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Employee ID: {user.employeeId}</p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-inner flex items-center justify-center">
                  <QRCode value={user.qrCode || user.employeeId} size={140} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                </div>
                <div className="text-[9px] text-slate-500 font-medium">
                  Scan this code at security checkpoints for entry/exit clearance
                </div>
              </div>
            </div>
            <Button onClick={() => setShowIdCard(false)} className="mt-5 w-full max-w-sm">Close ID Card</Button>
          </div>
        )}
      </Dialog>
      <UniversalProductScannerModal isOpen={showScannerModal} onClose={() => setShowScannerModal(false)} />
      <StaffRFIDTerminalModal isOpen={showStaffRfidModal} onClose={() => setShowStaffRfidModal(false)} />
    </header>
  );
};
