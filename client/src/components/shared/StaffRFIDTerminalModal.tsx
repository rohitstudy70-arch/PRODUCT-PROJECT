import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  CreditCard, 
  UserCheck, 
  UserX, 
  Phone, 
  User, 
  Building2, 
  Package, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';
import api from '../../config/api';
import { toast } from 'sonner';

interface StaffRFIDTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffRFIDTerminalModal: React.FC<StaffRFIDTerminalModalProps> = ({
  isOpen,
  onClose
}) => {
  const [rfidInput, setRfidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffData, setStaffData] = useState<any | null>(null);
  const [activeProducts, setActiveProducts] = useState<any[]>([]);
  const [togglingDuty, setTogglingDuty] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    } else {
      setStaffData(null);
      setActiveProducts([]);
      setRfidInput('');
    }
  }, [isOpen]);

  // USB/Hardware RFID Scanner Keypress Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // If user is typing in another input element, don't intercept unless it's our RFID input
      if (target && target !== inputRef.current && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 2) {
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = '';
          setRfidInput(scannedCode);
          handleScanRfid(scannedCode);
        }
      } else if (e.key.length === 1) {
        if (timeDiff < 50 || bufferRef.current.length > 0) {
          bufferRef.current += e.key;
        } else {
          bufferRef.current = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleScanRfid = async (codeToScan?: string) => {
    const code = codeToScan || rfidInput.trim();
    if (!code) {
      toast.error('Please scan or enter an RFID Smart Card ID / Employee ID');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/staff/scan-rfid', { code });
      const { staff, activeAssignedProducts } = response.data.data;

      setStaffData(staff);
      setActiveProducts(activeAssignedProducts || []);
      toast.success(`Staff Found: ${staff.firstName} ${staff.lastName} (${staff.employeeId})`);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'No staff member found for this RFID card';
      toast.error(msg);
      setStaffData(null);
      setActiveProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDuty = async () => {
    if (!staffData) return;

    setTogglingDuty(true);
    try {
      const response = await api.patch(`/staff/${staffData._id}/toggle-duty`);
      const updatedStaff = response.data.data;

      setStaffData((prev: any) => ({
        ...prev,
        dutyStatus: updatedStaff.dutyStatus
      }));

      if (updatedStaff.dutyStatus === 'ON_DUTY') {
        toast.success(`⚡ Duty Activated: ${updatedStaff.firstName} is now ON DUTY`);
      } else {
        toast.info(`🔴 Duty Ended: ${updatedStaff.firstName} is now OFF DUTY`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle duty status');
    } finally {
      setTogglingDuty(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="🪪 Staff RFID Terminal & Attendance Check-in">
      <div className="space-y-5">
        {/* Hardware Status Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <CreditCard className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="font-semibold">RFID Reader Status:</span>
            <span className="text-emerald-400 font-medium">Ready (Scan Staff Badge)</span>
          </div>
          <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-950/40 text-[10px]">
            HID Scanner Mode
          </Badge>
        </div>

        {/* Scan Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScanRfid();
          }}
          className="flex space-x-2"
        >
          <div className="relative flex-1">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Scan Staff RFID Smart Card or type EMP ID..."
              value={rfidInput}
              onChange={(e) => setRfidInput(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-indigo-500 text-sm"
            />
          </div>
          <Button type="submit" loading={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Sparkles className="h-4 w-4 mr-1" />
            <span>Identify</span>
          </Button>
        </form>

        {/* Staff Identity Card View */}
        {staffData ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-indigo-500/30 shadow-xl relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xl shadow-inner overflow-hidden">
                    {staffData.avatar ? (
                      <img src={staffData.avatar} alt="Staff" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        {staffData.firstName?.[0]}
                        {staffData.lastName?.[0]}
                      </>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                      <span>{staffData.firstName} {staffData.lastName}</span>
                      <ShieldCheck className="h-4 w-4 text-indigo-400" />
                    </h3>
                    <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                      <span className="font-mono text-indigo-300">{staffData.employeeId}</span>
                      <span>•</span>
                      <span>{staffData.designation}</span>
                    </div>
                  </div>
                </div>

                {/* Duty Toggle Action */}
                <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                  <Badge
                    variant={staffData.dutyStatus === 'ON_DUTY' ? 'default' : 'secondary'}
                    className={`px-3 py-1 text-xs font-semibold ${
                      staffData.dutyStatus === 'ON_DUTY'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {staffData.dutyStatus === 'ON_DUTY' ? '⚡ LIVE ON DUTY' : '🔴 OFF DUTY'}
                  </Badge>

                  <Button
                    size="sm"
                    onClick={handleToggleDuty}
                    loading={togglingDuty}
                    variant={staffData.dutyStatus === 'ON_DUTY' ? 'destructive' : 'default'}
                    className="flex items-center space-x-1"
                  >
                    {staffData.dutyStatus === 'ON_DUTY' ? (
                      <>
                        <UserX className="h-3.5 w-3.5" />
                        <span>End Duty</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Start Duty</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold flex items-center space-x-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>Mobile Phone</span>
                  </div>
                  <div className="text-slate-200 font-medium mt-1">{staffData.phone || 'N/A'}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold flex items-center space-x-1">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>S/O Father Name</span>
                  </div>
                  <div className="text-slate-200 font-medium mt-1 truncate">{staffData.fatherName || 'N/A'}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold flex items-center space-x-1">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    <span>Branch Location</span>
                  </div>
                  <div className="text-slate-200 font-medium mt-1 truncate">
                    {staffData.branchId?.name || staffData.currentBranchId?.name || 'Head Office'}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Assigned Packages Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Package className="h-4 w-4 text-indigo-400" />
                <span>Assigned Deliveries ({activeProducts.length})</span>
              </h4>

              {activeProducts.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {activeProducts.map((prod) => (
                    <div
                      key={prod._id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{prod.modelName || prod.productId}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          IMEI: {prod.imei || 'N/A'} • SN: {prod.serialNumber || 'N/A'}
                        </div>
                      </div>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-950/30 text-[10px]">
                        {prod.status?.toUpperCase() || 'IN TRANSIT'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-center text-xs text-slate-500 flex flex-col items-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500/60 mb-1" />
                  <span>No active packages currently assigned to this staff member.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 text-center flex flex-col items-center">
            <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400 mb-2 animate-bounce">
              <CreditCard className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">Ready for RFID Smart Card Scan</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Tap any Staff RFID ID Card on your reader or type the Employee ID to instantly identify staff and toggle duty attendance.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
};
