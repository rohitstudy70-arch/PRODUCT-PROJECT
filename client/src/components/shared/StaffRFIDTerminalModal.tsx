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
  Sparkles,
  MapPin
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

      // ── Smart Duty: Entry ON / Exit OFF (if no products) / Stay ON (if products assigned) ──
      try {
        setTogglingDuty(true);
        const toggleRes = await api.patch(`/staff/${staff._id}/toggle-duty`);
        const updatedStaff = toggleRes.data.data;
        const message = toggleRes.data.message;

        setStaffData((prev: any) => ({
          ...prev,
          dutyStatus: updatedStaff.dutyStatus
        }));

        if (updatedStaff.dutyStatus === 'OFF_DUTY') {
          // Clean exit — no active products
          toast.info(`🔴 Warehouse EXIT — ${staff.firstName} ${staff.lastName} checked out (no active products)`);
        } else if (updatedStaff.dutyStatus === 'ON_DUTY' && message.includes('active product')) {
          // Has products — blocked exit
          toast.warning(`⚡ ${staff.firstName} ${staff.lastName} has active products/transfers — Duty stays ON until delivery`);
        } else if (updatedStaff.dutyStatus === 'ON_DUTY') {
          // Fresh entry
          toast.success(`🟢 Warehouse ENTRY logged — ${staff.firstName} ${staff.lastName} is now ON DUTY`);
        }
      } catch (toggleErr: any) {
        toast.error(toggleErr.response?.data?.message || 'Failed to log warehouse entry');
      } finally {
        setTogglingDuty(false);
      }
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
    <Dialog isOpen={isOpen} onClose={onClose} title="🪪 Staff RFID Terminal ">
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
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/20 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 border-b border-slate-800/80 pb-5">
                {/* Large Profile Photo */}
                <div className="relative">
                  <div className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center text-slate-200 font-bold text-3xl shadow-2xl overflow-hidden transition-all duration-500 ${
                    staffData.dutyStatus === 'ON_DUTY'
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-500/20'
                      : 'border-rose-500 bg-rose-950/20 shadow-rose-500/20'
                  }`}>
                    {staffData.avatar ? (
                      <img src={staffData.avatar} alt="Staff" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-indigo-400 uppercase">
                        {staffData.firstName?.[0]}
                        {staffData.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  {/* Status Indicator Dot */}
                  <span className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border shadow-md ${
                    staffData.dutyStatus === 'ON_DUTY'
                      ? 'bg-emerald-500 text-emerald-950 border-emerald-400 animate-pulse'
                      : 'bg-rose-500 text-rose-950 border-rose-400'
                  }`}>
                    {staffData.dutyStatus === 'ON_DUTY' ? 'Active' : 'Offline'}
                  </span>
                </div>

                {/* Staff Meta Info */}
                <div className="flex-1 text-center md:text-left space-y-2">
                  <div>
                    <h3 className="text-xl font-black text-slate-100 flex items-center justify-center md:justify-start space-x-2">
                      <span>{staffData.firstName} {staffData.lastName}</span>
                      <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1 flex items-center justify-center md:justify-start space-x-2">
                      <span className="font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/30">{staffData.employeeId}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-indigo-200">{staffData.designation || 'Staff Member'}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                    <Badge className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${
                      staffData.dutyStatus === 'ON_DUTY'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {staffData.dutyStatus === 'ON_DUTY' ? '🟢 Live On Duty' : '🔴 Off Duty'}
                    </Badge>
                    {staffData.rfidCard && (
                      <Badge variant="outline" className="border-indigo-500/20 text-indigo-300 bg-indigo-950/20 text-[10px] font-mono">
                        🪪 {staffData.rfidCard}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Duty Status / Action */}
                <div className="flex items-center space-x-2 self-center">
                  {staffData.dutyStatus === 'ON_DUTY' ? (
                    <div className="flex flex-col items-center space-y-1">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2.5 py-1 animate-pulse">
                        🟢 ON DUTY
                      </Badge>
                      <span className="text-[9px] text-slate-500 text-center leading-tight max-w-[120px]">
                        Auto-off on delivery
                      </span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleToggleDuty}
                      loading={togglingDuty}
                      className="flex items-center space-x-1 text-xs px-3 shadow-md bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Start Duty</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200">
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1.5">
                    <Phone className="h-3.5 w-3.5 text-indigo-450" />
                    <span>Mobile Phone</span>
                  </div>
                  <div className="text-slate-200 font-semibold mt-1.5 text-sm">{staffData.phone || 'N/A'}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200">
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-450" />
                    <span>S/O Father Name</span>
                  </div>
                  <div className="text-slate-200 font-semibold mt-1.5 text-sm truncate">{staffData.fatherName || 'N/A'}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200">
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1.5">
                    <Building2 className="h-3.5 w-3.5 text-indigo-450" />
                    <span>Branch Location</span>
                  </div>
                  <div className="text-slate-200 font-semibold mt-1.5 text-sm truncate">
                    {staffData.branchId?.name || staffData.currentBranchId?.name || 'Head Office'}
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 mt-4 text-xs">
                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Residential Address</span>
                </div>
                <div className="text-slate-200 font-semibold mt-1.5 text-xs flex flex-wrap gap-1 leading-relaxed">
                  {staffData.addressDetails && (staffData.addressDetails.street || staffData.addressDetails.district || staffData.addressDetails.state || staffData.addressDetails.pincode) ? (
                    <>
                      {staffData.addressDetails.street && <span>{staffData.addressDetails.street},</span>}
                      {staffData.addressDetails.district && <span>{staffData.addressDetails.district},</span>}
                      {staffData.addressDetails.state && <span>{staffData.addressDetails.state}</span>}
                      {staffData.addressDetails.pincode && <span className="text-indigo-400 font-mono">({staffData.addressDetails.pincode})</span>}
                    </>
                  ) : (
                    <span className="text-slate-500">Address details not provided</span>
                  )}
                </div>
              </div>

              {/* Driving Licence Document Verification */}
              {(staffData.drivingLicense || staffData.drivingLicenseFront || staffData.drivingLicenseBack) && (
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 mt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1.5">
                      <span className="text-base">🚗</span>
                      <span>Driving Licence Verification</span>
                    </div>
                    {staffData.drivingLicense && (
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 bg-cyan-950/30 text-[10px] font-mono">
                        DL: {staffData.drivingLicense}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* DL Front Photo */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Front Side</span>
                      <div className="h-32 rounded-lg border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden">
                        {staffData.drivingLicenseFront ? (
                          <img
                            src={staffData.drivingLicenseFront}
                            alt="DL Front"
                            className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() => window.open(staffData.drivingLicenseFront, '_blank')}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-600">Front photo not uploaded</span>
                        )}
                      </div>
                    </div>

                    {/* DL Back Photo */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Back Side</span>
                      <div className="h-32 rounded-lg border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden">
                        {staffData.drivingLicenseBack ? (
                          <img
                            src={staffData.drivingLicenseBack}
                            alt="DL Back"
                            className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() => window.open(staffData.drivingLicenseBack, '_blank')}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-600">Back photo not uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
