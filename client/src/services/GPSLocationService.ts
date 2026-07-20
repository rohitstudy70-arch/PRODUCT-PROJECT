import api from '../config/api';

class GPSLocationTracker {
  private watchId: number | null = null;
  private intervalId: any = null;
  private isTrackingActive: boolean = false;
  private lastPosition: GeolocationPosition | null = null;

  public async startTracking(): Promise<boolean> {
    if (this.isTrackingActive) return true;

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported by this browser.');
      return false;
    }

    this.isTrackingActive = true;

    // Trigger immediate geolocation capture
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.lastPosition = pos;
        this.sendTelemetry(pos);
      },
      (err) => {
        console.warn('Initial GPS position error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Watch position changes
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.lastPosition = pos;
      },
      (err) => {
        console.warn('GPS watchPosition error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    // Send location telemetry every 20 seconds while duty is ON
    this.intervalId = setInterval(() => {
      if (this.lastPosition) {
        this.sendTelemetry(this.lastPosition);
      } else {
        // Fallback retry
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.lastPosition = pos;
            this.sendTelemetry(pos);
          },
          () => {},
          { enableHighAccuracy: true }
        );
      }
    }, 20000);

    return true;
  }

  public stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
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
}

export const gpsTracker = new GPSLocationTracker();
export default gpsTracker;
