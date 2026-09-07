import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { ROUTES } from '../config/routes';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Menu, QrCode, Scan, CreditCard, Bell } from 'lucide-react';
import QRCode from 'react-qr-code';
import { UniversalProductScannerModal } from '../components/shared/UniversalProductScannerModal';
import { StaffRFIDTerminalModal } from '../components/shared/StaffRFIDTerminalModal';
import { io } from 'socket.io-client';
import api from '../config/api';

export const Header: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const [showIdCard, setShowIdCard] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showStaffRfidModal, setShowStaffRfidModal] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;

    // Fetch initial logs
    api.get('/security/scans', { params: { limit: 5 } })
      .then(res => {
        const initialLogs = (res.data.data || []).map((scan: any) => {
          const isEntry = scan.type === 'entry' || scan.type === 'gate_entry';
          return {
            id: scan._id,
            title: isEntry ? 'Warehouse Entry 📥' : 'Warehouse Exit 📤',
            desc: `${scan.staffQR?.staffId?.firstName || 'Staff'} ${scan.staffQR?.staffId?.lastName || ''} passed Gate ${scan.gateNumber}`,
            timestamp: scan.timestamp,
            read: true
          };
        });
        setNotifications(initialLogs);
      })
      .catch(err => console.error('Failed to load initial notifications', err));

    // Connect socket
    const socketUrl = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5000').replace('/api/v1', '');
    const socket = io(socketUrl, { withCredentials: true });

    socket.on('security_scan_logged', (newScan: any) => {
      const isEntry = newScan.type === 'entry' || newScan.type === 'gate_entry';
      const staffName = `${newScan.staffQR?.staffId?.firstName || 'Staff'} ${newScan.staffQR?.staffId?.lastName || ''}`;
      
      const newNotif = {
        id: newScan._id,
        title: isEntry ? 'Warehouse Entry 📥' : 'Warehouse Exit 📤',
        desc: `${staffName} passed Gate ${newScan.gateNumber}`,
        timestamp: newScan.timestamp,
        read: false
      };

      setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

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
        
        {/* Super Admin Live Alerts Dropdown */}
        {user?.role === 'super_admin' && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setUnreadCount(0); // clear count on open
              }}
              className="text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60 rounded-lg relative cursor-pointer"
              title="Activity Alerts"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <>
                {/* Backdrop overlay to close dropdown */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)}
                />
                
                <div className="absolute right-0 mt-2.5 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-in fade-in-50 duration-200">
                  <div className="px-4 py-2.5 bg-slate-900/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Live Staff Swipes</span>
                    <Link 
                      to={ROUTES.STAFF_ACTIVITY}
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider"
                    >
                      View All
                    </Link>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-900">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No recent gate scans logged.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          className={`p-3 text-xs hover:bg-slate-900 transition-colors flex flex-col space-y-0.5 ${
                            !notif.read ? 'bg-indigo-950/10 border-l-2 border-l-indigo-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{notif.title}</span>
                            <span className="text-[9px] text-slate-500">
                              {new Date(notif.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{notif.desc}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
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
