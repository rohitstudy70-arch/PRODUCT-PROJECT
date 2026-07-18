import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '../ui/button';
import { Camera, Keyboard, AlertCircle } from 'lucide-react';
import { Input } from '../ui/input';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  placeholder?: string;
  active?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  placeholder = "Scan QR Code",
  active = true
}) => {
  const [scannerMode, setScannerMode] = useState<'camera' | 'usb'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const readerId = "qr-scanner-element";

  // USB Barcode Scanner Key interception
  // USB scanners act as keyboards and type fast + send an "Enter" key
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Throttling references for camera scanner success
  const lastScanTimeRef = useRef<number>(0);
  const lastScanTextRef = useRef<string>('');

  const handleScanResult = (decodedText: string) => {
    const now = Date.now();
    // 1. Same code scan throttling: ignore if scanned same code within 3.5 seconds
    if (decodedText === lastScanTextRef.current && (now - lastScanTimeRef.current) < 3500) {
      return;
    }
    // 2. Cross scan throttling: ignore any scan within 1.5 seconds to avoid rapid multi-firing
    if ((now - lastScanTimeRef.current) < 1500) {
      return;
    }

    lastScanTimeRef.current = now;
    lastScanTextRef.current = decodedText;
    onScanSuccess(decodedText);
  };

  useEffect(() => {
    if (scannerMode !== 'camera' || !active) return;

    const startScanner = async () => {
      try {
        setCameraError(null);
        const html5Qrcode = new Html5Qrcode(readerId);
        qrReaderRef.current = html5Qrcode;

        // Query available camera devices
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        
        if (devices && devices.length > 0) {
          // Select back camera if available, otherwise first camera (webcam)
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          const cameraId = backCamera ? backCamera.id : devices[0].id;

          await html5Qrcode.start(
            cameraId,
            {
              fps: 30,
              qrbox: (width, height) => {
                const min = Math.min(width, height);
                const size = Math.floor(min * 0.7);
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              handleScanResult(decodedText);
            },
            () => {
              // silent fail for scans in progress
            }
          );
        } else {
          // Fallback to facingMode constraint if getCameras returned empty list
          await html5Qrcode.start(
            { facingMode: "user" },
            {
              fps: 30,
              qrbox: (width, height) => {
                const min = Math.min(width, height);
                const size = Math.floor(min * 0.7);
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              handleScanResult(decodedText);
            },
            () => {
              // silent fail for scans in progress
            }
          );
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        setCameraError("Camera permission denied, webcam blocked, or no camera found. Please use manual USB/Keyboard entry mode.");
      }
    };

    // delay slightly to ensure DOM element is mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (qrReaderRef.current && qrReaderRef.current.isScanning) {
        qrReaderRef.current.stop().catch(console.error);
      }
    };
  }, [scannerMode, active]);

  // USB Scanner hardware key interceptor
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // If typing speed is fast (less than 50ms per key) or we are focusing the manual input, let it buffer
      if (e.key === 'Enter') {
        if (bufferRef.current.length > 2) {
          onScanSuccess(bufferRef.current);
          bufferRef.current = '';
        }
      } else {
        // Only buffer readable characters
        if (e.key.length === 1) {
          if (timeDiff < 50 || bufferRef.current.length > 0) {
            bufferRef.current += e.key;
          } else {
            // Slow typing, reset buffer
            bufferRef.current = e.key;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onScanSuccess]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScanSuccess(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab select mode */}
      <div className="flex justify-center space-x-2 border-b border-slate-800 pb-2">
        <Button
          variant={scannerMode === 'camera' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setScannerMode('camera')}
          className="flex items-center space-x-1"
        >
          <Camera className="h-4 w-4" />
          <span>Camera Scanner</span>
        </Button>
        <Button
          variant={scannerMode === 'usb' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setScannerMode('usb')}
          className="flex items-center space-x-1"
        >
          <Keyboard className="h-4 w-4" />
          <span>USB Scanner / Keyboard</span>
        </Button>
      </div>

      {scannerMode === 'camera' && (
        <div className="relative flex flex-col items-center">
          <div
            id={readerId}
            className="w-full max-w-sm rounded-lg overflow-hidden border border-slate-800 bg-slate-950/80 aspect-square flex items-center justify-center"
          >
            {cameraError && (
              <p className="text-sm text-amber-400 text-center p-4">{cameraError}</p>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center space-x-1">
            <AlertCircle className="h-3 w-3 text-indigo-400" />
            <span>Align QR code within the highlighted camera box</span>
          </div>
        </div>
      )}

      {scannerMode === 'usb' && (
        <div className="p-6 border border-slate-850 bg-slate-900/50 rounded-xl flex flex-col items-center">
          <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400 mb-3 animate-pulse">
            <Keyboard className="h-8 w-8" />
          </div>
          <p className="text-sm text-slate-300 text-center font-medium">
            USB Barcode Scanner Active
          </p>
          <p className="text-xs text-slate-500 text-center mt-1">
            Scan using your connected USB hardware reader anywhere on this screen, or enter code below.
          </p>

          <form onSubmit={handleManualSubmit} className="mt-4 flex w-full max-w-sm space-x-2">
            <Input
              type="text"
              placeholder={placeholder}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
            />
            <Button type="submit">Submit</Button>
          </form>
        </div>
      )}
    </div>
  );
};
