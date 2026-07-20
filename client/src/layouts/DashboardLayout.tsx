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

  // Automated Duty Location Tracking Hook
  useEffect(() => {
    if (isAuthenticated && user?.dutyStatus === 'ON_DUTY') {
      // Show location request modal if duty is ON and tracking not started
      setShowLocationModal(true);
      gpsTracker.startTracking().then((started) => {
        if (started) {
          setPermissionGranted(true);
        }
      });
    } else {
      setShowLocationModal(false);
      setPermissionGranted(false);
      gpsTracker.stopTracking();
    }

    return () => {
      gpsTracker.stopTracking();
    };
  }, [isAuthenticated, user?.dutyStatus]);

  const handleEnableLocation = async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async () => {
        toast.success('GPS Location Permission Granted! Live duty tracking active.');
        setPermissionGranted(true);
        setShowLocationModal(false);
        await gpsTracker.startTracking();
      },
      (err) => {
        console.error('Location permission error:', err);
        toast.error('Location Permission Denied. Please enable location access in phone browser settings.');
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

      {/* Gate Clearance & Live Duty Location Permission Modal */}
      <Dialog 
        isOpen={showLocationModal && !permissionGranted} 
        onClose={() => setShowLocationModal(false)} 
        title="Official Duty Location Tracking Request"
      >
        <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse">
            <Navigation className="h-8 w-8" />
          </div>

          <div>
            <div className="flex items-center justify-center space-x-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Gate Clearance Approved • Official Duty Active</span>
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Enable GPS Location Permission
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Your gate exit clearance has been recorded by Security. To ensure official duty tracking, please tap below to grant location access in your browser.
            </p>
          </div>

          <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-left space-y-1">
            <p className="text-[11px] font-semibold text-slate-300">Why Location Access is Required:</p>
            <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
              <li>Real-time route & delivery movement tracking</li>
              <li>Automatically turns OFF when you return and scan at Gate Entry</li>
              <li>Pings location telemetry safely every 20 seconds</li>
            </ul>
          </div>

          <Button 
            onClick={handleEnableLocation} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <MapPin className="h-5 w-5" />
            <span>Enable Live GPS Location Access</span>
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
