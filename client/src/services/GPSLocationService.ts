import api from '../config/api';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export const requestNativeLocationPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await Geolocation.checkPermissions();
      if (status.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        return req.location === 'granted';
      }
      return true;
    } else {
      return new Promise((resolve) => {
        if (!('geolocation' in navigator)) return resolve(false);
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 10000 }
        );
      });
    }
  } catch (err) {
    console.warn('Native Location permission request error:', err);
    return false;
  }
};

class GPSLocationTracker {
  private watchId: number | null = null;
  private intervalId: any = null;
  private isTrackingActive: boolean = false;
  private lastPosition: GeolocationPosition | null = null;

  public async startTracking(): Promise<boolean> {
    if (this.isTrackingActive) return true;

    // Request native Android location permission prompt
    await requestNativeLocationPermission();

    this.isTrackingActive = true;

    // Trigger immediate geolocation capture
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.lastPosition = pos;
          this.sendTelemetry(pos);
        },
        (err) => {
          console.warn('Initial GPS position error, falling back to IP tracking:', err.message);
          this.sendIpTelemetry();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      // Watch position changes
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.lastPosition = pos;
        },
        (err) => {
          console.warn('GPS watchPosition error (GPS disabled or lost):', err.message);
          this.lastPosition = null; // Clear outdated GPS position when GPS is turned off
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );
    } else {
      // Browser does not support geolocation API, send IP telemetry directly
      this.sendIpTelemetry();
    }

    // Send location telemetry every 20 seconds while duty is ON
    this.intervalId = setInterval(() => {
      if (this.lastPosition) {
        this.sendTelemetry(this.lastPosition);
      } else {
        // GPS is OFF or position is unavailable, try to capture or fallback to IP telemetry
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              this.lastPosition = pos;
              this.sendTelemetry(pos);
            },
            (err) => {
              console.warn('GPS ping failed, sending IP fallback telemetry:', err.message);
              this.sendIpTelemetry();
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          this.sendIpTelemetry();
        }
      }
    }, 20000);

    return true;
  }

  public stopTracking(): void {
    if (this.watchId !== null) {
      if ('geolocation' in navigator) {
        navigator.geolocation.clearWatch(this.watchId);
      }
      this.watchId = null;
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isTrackingActive = false;
    this.lastPosition = null;
  }

  public isTracking(): boolean {
    return this.isTrackingActive;
  }

  private async sendTelemetry(pos: GeolocationPosition): Promise<void> {
    try {
      let batteryLevel = 100;
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
        } catch {
          // Battery API optional
        }
      }

      await api.post('/tracking/ping', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : 0, // convert m/s to km/h
        heading: pos.coords.heading || 0,
        batteryLevel,
        isInternetConnected: navigator.onLine,
        isGpsEnabled: true
      });
    } catch (err) {
      console.error('Failed to post location telemetry:', err);
    }
  }

  private async sendIpTelemetry(): Promise<void> {
    try {
      let batteryLevel = 100;
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
        } catch {
          // Battery API optional
        }
      }

      await api.post('/tracking/ping', {
        latitude: 0,
        longitude: 0,
        accuracy: 1000,
        speed: 0,
        heading: 0,
        batteryLevel,
        isInternetConnected: navigator.onLine,
        isGpsEnabled: false
      });
    } catch (err) {
      console.error('Failed to post IP fallback location telemetry:', err);
    }
  }
}

export const gpsTracker = new GPSLocationTracker();
export default gpsTracker;
