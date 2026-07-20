import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ROUTES } from '../config/routes';
import { useUIStore } from '../store/uiStore';
import gpsTracker from '../services/GPSLocationService';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Automated Duty Location Tracking Hook
  useEffect(() => {
    if (isAuthenticated && user?.dutyStatus === 'ON_DUTY') {
      gpsTracker.startTracking();
    } else {
      gpsTracker.stopTracking();
    }

    return () => {
      gpsTracker.stopTracking();
    };
  }, [isAuthenticated, user?.dutyStatus]);

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
    </div>
  );
};
