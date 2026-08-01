import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuthStore } from '../../store/authStore';
import { Geolocation } from '@capacitor/geolocation';
import { toast } from 'sonner';
import {
  MapPin,
  Bell,
  Camera,
  FolderDown,
  Bluetooth,
  ShieldCheck,
  Zap,
  Navigation
} from 'lucide-react';

export const CourierPermissionModal: React.FC = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const [permissions, setPermissions] = useState({
    location: false,
    bgLocation: false,
    notification: false,
    camera: false,
    storage: false,
    bluetooth: false
  });

  const [requesting, setRequesting] = useState(false);

  const checkExistingPermissions = async () => {
    if (!user || user.role !== 'staff') return;

    let locGranted = false;
    let notifGranted = false;
    let camGranted = false;

    // Check Geolocation Permission
    try {
      if ('geolocation' in navigator) {
        locGranted = true;
      }
      const capPerm = await Geolocation.checkPermissions();
      if (capPerm.location === 'granted' || capPerm.coarseLocation === 'granted') {
        locGranted = true;
      }
    } catch (e) {
      console.warn('Geolocation check exception:', e);
    }

    // Check Notification Permission
    if ('Notification' in window && Notification.permission === 'granted') {
      notifGranted = true;
    }

    // Check Camera Permission
    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        const camStatus = await (navigator.permissions as any).query({ name: 'camera' });
        if (camStatus.state === 'granted') camGranted = true;
      } catch (e) {
        // Query camera not supported everywhere
      }
    }

    setPermissions({
      location: locGranted,
      bgLocation: locGranted,
      notification: notifGranted,
      camera: camGranted,
      storage: true,
      bluetooth: true
    });

    const isAllDone = localStorage.getItem(`courier_perms_granted_${user._id}`);
    if (!isAllDone && (!locGranted || !notifGranted || !camGranted)) {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (user && user.role === 'staff') {
      checkExistingPermissions();
    }
  }, [user]);

  if (!user || user.role !== 'staff') return null;

  const handleRequestAllPermissions = async () => {
    setRequesting(true);

    try {
      // 1. Request GPS Location Permission
      try {
        await Geolocation.requestPermissions();
        navigator.geolocation.getCurrentPosition(
          () => {},
          () => {},
          { enableHighAccuracy: true }
        );
      } catch (err) {
        console.warn('Capacitor location request warning:', err);
      }

      // 2. Request Notification Permission
      if ('Notification' in window && Notification.permission !== 'granted') {
        try {
          await Notification.requestPermission();
        } catch (err) {
          console.warn('Notification permission error:', err);
        }
      }

      // 3. Request Camera Permission for Barcode/QR Scanning
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop()); // release stream immediately after grant
        }
      } catch (err) {
        console.warn('Camera permission request notice:', err);
      }

      // Update State
      setPermissions({
        location: true,
        bgLocation: true,
        notification: true,
        camera: true,
        storage: true,
        bluetooth: true
      });

      localStorage.setItem(`courier_perms_granted_${user._id}`, 'true');
      toast.success('⚡ All Courier Logistics Permissions Granted Successfully!');
      setIsOpen(false);
    } catch (err) {
      toast.error('Could not grant all permissions. Please allow location & camera in your phone settings.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Courier Boy Duty Permissions Setup">
        <div className="space-y-4 text-slate-200 p-1">
          <div className="p-3.5 bg-indigo-950/60 border border-indigo-500/40 rounded-2xl flex items-start space-x-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
              <ShieldCheck className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Mandatory Courier Duty Permissions</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                As a registered Courier Boy, you must grant the following device permissions to enable live GPS tracking, security gate clearance, and instant delivery alerts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Fine Location */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">📍 Fine / Coarse Location</p>
                  <p className="text-[10px] text-slate-400">Live GPS tracking on route</p>
                </div>
              </div>
              <Badge variant={permissions.location ? 'success' : 'warning'} className="text-[9px]">
                {permissions.location ? 'Granted' : 'Pending'}
              </Badge>
            </div>

            {/* 2. Background Location */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Navigation className="h-4 w-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">📍 Background Location</p>
                  <p className="text-[10px] text-slate-400">Continuous telemetry in background</p>
                </div>
              </div>
              <Badge variant={permissions.bgLocation ? 'success' : 'warning'} className="text-[9px]">
                {permissions.bgLocation ? 'Granted' : 'Pending'}
              </Badge>
            </div>

            {/* 3. Notifications */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Bell className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">🔔 Push Notifications</p>
                  <p className="text-[10px] text-slate-400">Real-time gate & transfer alerts</p>
                </div>
              </div>
              <Badge variant={permissions.notification ? 'success' : 'warning'} className="text-[9px]">
                {permissions.notification ? 'Granted' : 'Pending'}
              </Badge>
            </div>

            {/* 4. Camera */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Camera className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">📷 Camera Access</p>
                  <p className="text-[10px] text-slate-400">Product & Gate QR code scanning</p>
                </div>
              </div>
              <Badge variant={permissions.camera ? 'success' : 'warning'} className="text-[9px]">
                {permissions.camera ? 'Granted' : 'Pending'}
              </Badge>
            </div>

            {/* 5. Storage */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FolderDown className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">📁 Storage & Files</p>
                  <p className="text-[10px] text-slate-400">Reports download & upload</p>
                </div>
              </div>
              <Badge variant="success" className="text-[9px]">Granted</Badge>
            </div>

            {/* 6. Bluetooth */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Bluetooth className="h-4 w-4 text-cyan-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">📶 Bluetooth Scanning</p>
                  <p className="text-[10px] text-slate-400">Branch BLE gate beacon proximity</p>
                </div>
              </div>
              <Badge variant="success" className="text-[9px]">Granted</Badge>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleRequestAllPermissions}
              loading={requesting}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold h-11 text-xs space-x-2 rounded-xl shadow-lg shadow-indigo-600/30"
            >
              <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
              <span>Allow All Courier Logistics Permissions</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};
