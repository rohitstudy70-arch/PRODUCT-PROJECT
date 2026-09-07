import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Building2, 
  User, 
  Truck,
  Scan,
  Camera,
  Search,
  Check,
  Smartphone,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { QRScanner } from '../../../components/shared/QRScanner';
import { useAuthStore } from '../../../store/authStore';
import API from '../../../config/api';

interface Transfer {
  _id: string;
  transferId: string;
  fromBranchId: { _id: string; name: string; code: string };
  toBranchId: { _id: string; name: string; code: string };
  requestedBy?: { firstName: string; lastName: string; employeeId: string };
  assignedStaffId?: { firstName: string; lastName: string; employeeId: string };
  status: string;
  totalItems: number;
  createdAt: string;
  notes?: string;
}

interface CourierStaff {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone: string;
  dutyStatus?: string;
  status: string;
  avatar?: string;
  qrCode?: string;
  branchId?: { _id: string; name: string; code: string } | string;
  currentBranchId?: { _id: string; name: string; code: string } | string;
}

export const BranchManagerTransferPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [couriers, setCouriers] = useState<CourierStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Scanning & Employee Code Search States
  const [scanInput, setScanInput] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // OTP Verification States
  const [otpStep, setOtpStep] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpInfo, setOtpInfo] = useState<{ phoneMasked?: string; courierName?: string; otpDevMode?: string } | null>(null);

  const getId = (value: any) => value ? (typeof value === 'object' ? value._id : value) : '';
  const branchId = getId(user?.branchId);

  const fetchData = async () => {
    try {
      setLoading(true);
      const transferRes = await API.get('/transfers', { params: { limit: 100 } });
      const allTransfers: Transfer[] = transferRes.data?.data || transferRes.data || [];
      
      const isPurneaBranch = (name?: string, code?: string) => {
        if (!name && !code) return false;
        return (code && code.toUpperCase().startsWith('PR')) || 
               (name && (name.toLowerCase().includes('purnea') || name.toLowerCase().includes('central')));
      };

      const userBrName = typeof user?.branchId === 'object' ? user?.branchId?.name : '';
      const userBrCode = typeof user?.branchId === 'object' ? user?.branchId?.code : '';
      const isUserBranchPurnea = isPurneaBranch(userBrName, userBrCode);

      // Filter transfers needing courier assignment for this branch manager's branch
      const pendingTransfers = allTransfers.filter(t => {
        if (['dispatched', 'in_transit', 'arrived', 'received', 'cancelled', 'rejected'].includes(t.status)) return false;

        const isAwaitingCourier = !t.assignedStaffId || t.status === 'pending';
        if (!isAwaitingCourier) return false;

        if (!branchId || user?.role === 'super_admin') return true;

        const fromId = getId(t.fromBranchId);
        if (fromId === branchId) return true;

        if (isUserBranchPurnea) {
          const fromName = typeof t.fromBranchId === 'object' ? t.fromBranchId?.name : '';
          const fromCode = typeof t.fromBranchId === 'object' ? t.fromBranchId?.code : '';
          return isPurneaBranch(fromName, fromCode);
        }

        return false;
      });
      setTransfers(pendingTransfers);

      const courierRes = await API.get('/transfers/available-couriers', {
        params: branchId ? { branchId } : undefined
      });
      setCouriers(courierRes.data?.data || courierRes.data || []);
    } catch (err: any) {
      console.error('Error loading branch manager panel data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [branchId]);

  const handleOpenAssignModal = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setSelectedCourierId('');
    setScanInput('');
    setSearchQuery('');
    setShowCamera(false);
    setOtpStep(false);
    setOtpInput('');
    setOtpInfo(null);
    setActionError('');
    setActionSuccess('');
    setAssignModalOpen(true);
  };

  const handleScanCourier = (scannedCode: string) => {
    const query = scannedCode.trim().toLowerCase();
    if (!query) return;

    const matched = couriers.find(c => 
      c.employeeId?.toLowerCase() === query ||
      c._id === query ||
      c.phone === query ||
      c.qrCode === query ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
      c.employeeId?.toLowerCase().includes(query)
    );

    if (matched) {
      setSelectedCourierId(matched._id);
      setActionSuccess(`Matched Courier: ${matched.firstName} ${matched.lastName} (${matched.employeeId})`);
      setActionError('');
      setShowCamera(false);
      setScanInput('');
    } else {
      setActionError(`No courier found matching Employee Code / Tag: "${scannedCode}"`);
      setActionSuccess('');
    }
  };

  // Step 1: Send SMS OTP to Courier's phone
  const handleSendOtp = async () => {
    if (!selectedTransfer || !selectedCourierId) {
      setActionError('Please scan or select a Courier Boy first.');
      return;
    }

    try {
      setSendingOtp(true);
      setActionError('');
      setActionSuccess('');

      let res;
      try {
        res = await API.post(`/transfers/${selectedTransfer._id}/send-courier-otp`, {
          assignedStaffId: selectedCourierId
        });
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Fallback to assign-courier with send_otp action if server route is still deploying
          res = await API.patch(`/transfers/${selectedTransfer._id}/assign-courier`, {
            assignedStaffId: selectedCourierId,
            action: 'send_otp',
            sendOtp: true
          });
        } else {
          throw err;
        }
      }

      const data = res.data?.data || res.data || {};
      setOtpInfo({
        phoneMasked: data.phoneMasked,
        courierName: data.courierName,
        otpDevMode: data.otpDevMode
      });
      setOtpStep(true);
      setActionSuccess(`📱 SMS OTP sent to registered number (${data.phoneMasked || 'Courier Phone'})`);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to send OTP to courier');
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP and Confirm Assignment
  const handleVerifyOtpAndAssign = async () => {
    if (!selectedTransfer || !selectedCourierId) {
      setActionError('Please select a Courier Boy.');
      return;
    }

    if (!otpInput.trim()) {
      setActionError('Please enter the 4-digit OTP received on Courier Boy\'s phone.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError('');
      await API.patch(`/transfers/${selectedTransfer._id}/assign-courier`, {
        assignedStaffId: selectedCourierId,
        otp: otpInput.trim()
      });
      
      setActionSuccess(`Courier assigned & verified via OTP successfully for Transfer ${selectedTransfer.transferId}!`);
      setTimeout(() => {
        setAssignModalOpen(false);
        fetchData();
      }, 1200);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to verify OTP / assign courier');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourierObj = couriers.find(c => c._id === selectedCourierId);

  const filteredCouriers = couriers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.employeeId.toLowerCase().includes(q) ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-800/40 rounded-xl p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-100">Branch Manager Control Center</h2>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                  {user?.branchId?.name || 'Headquarters'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review transfer orders from Authorized Persons and assign delivery couriers via SMS OTP verification.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-center">
              <span className="text-xs text-slate-400 block">Pending Requests</span>
              <span className="text-lg font-bold text-amber-400">{transfers.length}</span>
            </div>
            <div className="px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-center">
              <span className="text-xs text-slate-400 block">Branch Couriers</span>
              <span className="text-lg font-bold text-emerald-400">{couriers.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Transfer Requests (2 columns) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-slate-100">Pending Transfers Needing Courier</h3>
            </div>
            <span className="text-xs text-slate-400">Auto-updating</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading pending transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">All Transfer Orders Assigned!</p>
              <p className="text-xs text-slate-500 mt-1">There are no pending requests waiting for courier assignment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((t) => (
                <div 
                  key={t._id}
                  className="p-4 bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 rounded-xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-blue-400 text-sm">{t.transferId}</span>
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                        Awaiting Courier
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-300">
                      <span className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>By: <strong className="text-slate-200">{t.requestedBy ? `${t.requestedBy.firstName} ${t.requestedBy.lastName}` : 'Authorized Person'}</strong></span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.totalItems} Products</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center space-x-2">
                      <span className="text-slate-300 font-medium">{t.fromBranchId?.name}</span>
                      <ArrowRightLeft className="w-3 h-3 text-slate-500" />
                      <span className="text-blue-400 font-medium">{t.toBranchId?.name}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleOpenAssignModal(t)}
                    className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30 text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    <UserCheck className="w-4 h-4 mr-1.5" />
                    Assign Courier
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branch Courier Roster (1 column) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-slate-100">Branch Courier Roster</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">{couriers.length} Active</span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {couriers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No couriers registered for this branch.</p>
            ) : (
              couriers.map((c) => (
                <div key={c._id} className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200 border border-slate-700">
                      {c.firstName.charAt(0)}{c.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{c.firstName} {c.lastName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {c.employeeId}</p>
                    </div>
                  </div>
                  <Badge className={c.dutyStatus === 'ON_DUTY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]' : 'bg-slate-800 text-slate-400 text-[10px]'}>
                    {c.dutyStatus === 'ON_DUTY' ? 'On Duty' : 'Available'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Assign Courier Modal */}
      {assignModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  <span>{otpStep ? 'Verify SMS OTP & Assign Courier' : 'Assign Courier to Transfer Order'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transfer Order <strong className="text-blue-400 font-mono">{selectedTransfer.transferId}</strong> ({selectedTransfer.totalItems} Items)
                </p>
              </div>
              <button 
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {!otpStep ? (
              /* STEP 1: SELECT / SCAN COURIER STAFF */
              <div className="space-y-4">
                {/* Scan Staff ID QR / Type Employee Code Box */}
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                  <label className="text-xs font-semibold text-blue-300 flex items-center space-x-1.5">
                    <Scan className="w-4 h-4 text-blue-400" />
                    <span>Scan Staff ID Card / Enter Employee Code</span>
                  </label>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (scanInput) handleScanCourier(scanInput);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="text"
                      placeholder="Scan Staff ID or type Employee Code (e.g. EMP00074)..."
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <Button 
                      type="submit"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs whitespace-nowrap h-9 px-3"
                    >
                      Match
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCamera(!showCamera)}
                      className="h-9 px-3 border-slate-700 text-slate-300 text-xs flex items-center space-x-1"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      <span>{showCamera ? 'Hide Camera' : 'Camera'}</span>
                    </Button>
                  </form>

                  {/* Camera Scanner View */}
                  {showCamera && (
                    <div className="pt-2 border-t border-slate-800">
                      <QRScanner
                        placeholder="Scan Staff ID QR Tag"
                        onScanSuccess={(scanned) => handleScanCourier(scanned)}
                      />
                    </div>
                  )}
                </div>

                {/* Selected Courier Summary Card */}
                {selectedCourierObj ? (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300 text-sm">
                        {selectedCourierObj.firstName.charAt(0)}{selectedCourierObj.lastName?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-100">{selectedCourierObj.firstName} {selectedCourierObj.lastName}</span>
                          <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] py-0">
                            <Check className="w-3 h-3 mr-0.5" /> Verified Courier
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Emp ID: <strong className="text-emerald-400">{selectedCourierObj.employeeId}</strong> • Phone: {selectedCourierObj.phone}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setSelectedCourierId('')}
                      className="text-xs text-slate-400 hover:text-slate-200 h-7 px-2"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  /* Courier Search & Selection List */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Or Select Courier Boy from Branch Roster *
                      </label>
                      <div className="relative w-48">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Filter by name / code..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 pl-8 pr-2 w-full rounded-md border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {filteredCouriers.length === 0 ? (
                      <p className="text-xs text-amber-400 py-3 text-center bg-slate-950/40 rounded-lg border border-slate-800">
                        No matching couriers found in branch roster.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {filteredCouriers.map((c) => (
                          <div 
                            key={c._id}
                            onClick={() => setSelectedCourierId(c._id)}
                            className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                              selectedCourierId === c._id 
                                ? 'bg-blue-600/15 border-blue-500 text-slate-100 shadow-sm' 
                                : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input 
                                type="radio" 
                                name="courierSelect" 
                                checked={selectedCourierId === c._id}
                                onChange={() => setSelectedCourierId(c._id)}
                                className="accent-blue-500"
                              />
                              <div>
                                <p className="text-xs font-bold text-slate-200">{c.firstName} {c.lastName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">Emp ID: {c.employeeId} • {c.phone}</p>
                              </div>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">
                              Available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                  <Button 
                    variant="outline"
                    onClick={() => setAssignModalOpen(false)}
                    className="text-xs border-slate-700 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !selectedCourierId}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5"
                  >
                    {sendingOtp ? (
                      <span className="flex items-center space-x-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                        Sending SMS OTP...
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <Smartphone className="w-3.5 h-3.5 mr-1" />
                        Send SMS OTP to Courier
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* STEP 2: OTP VERIFICATION STEP */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 bg-slate-950/80 border border-blue-500/30 rounded-xl space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100">
                        SMS OTP Sent to {selectedCourierObj?.firstName} {selectedCourierObj?.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Mobile: <strong className="text-blue-400">{otpInfo?.phoneMasked || selectedCourierObj?.phone}</strong>
                      </p>
                    </div>
                  </div>

                  {otpInfo?.otpDevMode && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300 font-mono flex items-center justify-between">
                      <span>🔑 [DEMO MODE OTP]:</span>
                      <strong className="text-amber-400 text-sm tracking-widest">{otpInfo.otpDevMode}</strong>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    <span>Enter 4-Digit OTP Received on Courier Boy's Phone *</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 4-digit OTP (e.g. 4892)"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-blue-500/50 bg-slate-950 px-4 text-center font-mono text-lg tracking-widest text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 text-center">
                    Courier Boy must share the SMS code received on SIM card to authorize delivery duty.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="text-xs text-blue-400 hover:text-blue-300 p-0 flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${sendingOtp ? 'animate-spin' : ''}`} />
                    <span>Resend OTP SMS</span>
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => setOtpStep(false)}
                      className="text-xs border-slate-700 text-slate-300"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleVerifyOtpAndAssign}
                      disabled={submitting || !otpInput.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5"
                    >
                      {submitting ? 'Verifying...' : 'Verify OTP & Confirm Assignment'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
