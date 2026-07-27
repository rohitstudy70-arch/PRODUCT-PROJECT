import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ROUTES } from '../config/routes';
import { useUIStore } from '../store/uiStore';
import gpsTracker from '../services/GPSLocationService';
import { Dialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Automated Duty & Mandatory Courier Staff Location Tracking Hook
  useEffect(() => {
    if (isAuthenticated) {
      const isCourierStaff = user?.role === 'staff';
      const isOnDuty = user?.dutyStatus === 'ON_DUTY';

      if (isCourierStaff || isOnDuty) {
        // Automatically check GPS and prompt location modal for courier staff or active duty staff
        setShowLocationModal(true);
        gpsTracker.startTracking().then((started) => {
          if (started) {
            setPermissionGranted(true);
          } else {
            setPermissionGranted(false);
          }
        });
      } else {
        setShowLocationModal(false);
        setPermissionGranted(false);
        gpsTracker.stopTracking();
      }
    }

    return () => {
      gpsTracker.stopTracking();
    };
  }, [isAuthenticated, user?.dutyStatus, user?.role]);

  const handleEnableLocation = async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async () => {
        toast.success('GPS Location Activated Successfully! Courier Portal Unlocked.');
        setPermissionGranted(true);
        setShowLocationModal(false);
        await gpsTracker.startTracking();
      },
      (err) => {
        console.error('Location permission error:', err);
        toast.error('GPS Permission Denied / Turned Off! Please enable Location Services in your phone settings to unlock portal.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Handle closing sidebar by default on mobile load
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-[1px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Inner page viewports */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mandatory Courier Staff Location Permission Modal */}
      <Dialog 
        isOpen={showLocationModal && !permissionGranted} 
        onClose={() => {
          if (user?.role !== 'staff') {
            setShowLocationModal(false);
          }
        }} 
        title={user?.role === 'staff' ? "🚨 Mandatory Courier GPS Activation Required" : "Official Duty Location Tracking Request"}
      >
        <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse">
            <Navigation className="h-8 w-8" />
          </div>

          <div>
            <div className="flex items-center justify-center space-x-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>{user?.role === 'staff' ? 'Courier Staff Mandatory GPS Check' : 'Gate Clearance Approved • Official Duty Active'}</span>
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Turn ON Location / GPS to Unlock Portal
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {user?.role === 'staff'
                ? 'As per enterprise security policy, Courier Staff must turn ON GPS Location to open the portal and process manifest transfers.'
                : 'Your gate exit clearance has been recorded by Security. To ensure official duty tracking, please tap below to grant location access in your browser.'}
            </p>
          </div>

          <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-left space-y-1">
            <p className="text-[11px] font-semibold text-slate-300">Mandatory GPS Tracking Rules:</p>
            <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
              <li>Live route tracking active during transit</li>
              <li>Portal remains locked until GPS location is enabled</li>
              <li>Location telemetry pings safely every 20 seconds</li>
            </ul>
          </div>

          <Button 
            onClick={handleEnableLocation} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <MapPin className="h-5 w-5" />
            <span>🟢 TURN ON GPS & UNLOCK COURIER PORTAL</span>
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
