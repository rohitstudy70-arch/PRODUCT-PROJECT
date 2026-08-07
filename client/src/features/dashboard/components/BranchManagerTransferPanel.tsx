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
  Truck
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
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

  const branchId = user?.branchId?._id;

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch transfers
      const transferRes = await API.get('/transfers');
      const allTransfers: Transfer[] = transferRes.data?.data || transferRes.data || [];
      
      // Filter pending transfers for this branch manager's branch
      const pendingTransfers = allTransfers.filter(t => {
        const fromId = typeof t.fromBranchId === 'object' ? t.fromBranchId?._id : t.fromBranchId;
        return t.status === 'pending' && (!branchId || fromId === branchId);
      });
      setTransfers(pendingTransfers);

      // Fetch staff members in this branch for courier assignment
      const staffRes = await API.get('/staff', { params: { limit: 100 } });
      const allStaff: CourierStaff[] = staffRes.data?.data || staffRes.data || [];
      
      const branchCouriers = allStaff.filter((s: any) => {
        const staffBranch = typeof s.branchId === 'object' ? s.branchId?._id : s.branchId;
        return s.role === 'staff' && (!branchId || staffBranch === branchId) && s.status !== 'inactive';
      });
      setCouriers(branchCouriers);
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
    setActionError('');
    setActionSuccess('');
    setAssignModalOpen(true);
  };

  const handleAssignCourier = async () => {
    if (!selectedTransfer || !selectedCourierId) {
      setActionError('Please select an available Courier Boy.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError('');
      await API.patch(`/transfers/${selectedTransfer._id}/assign-courier`, {
        assignedStaffId: selectedCourierId
      });
      
      setActionSuccess(`Courier assigned successfully to Transfer ${selectedTransfer.transferId}!`);
      setTimeout(() => {
        setAssignModalOpen(false);
        fetchData();
      }, 1200);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to assign courier');
    } finally {
      setSubmitting(false);
    }
  };

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
                Review transfer orders from Authorized Persons and assign delivery couriers.
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
                  <Badge className={c.dutyStatus === 'on_duty' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]' : 'bg-slate-800 text-slate-400 text-[10px]'}>
                    {c.dutyStatus === 'on_duty' ? 'Available' : 'On Standby'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Assign Courier Modal */}
      {assignModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  <span>Assign Courier Boy</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transfer <strong className="text-blue-400">{selectedTransfer.transferId}</strong> ({selectedTransfer.totalItems} Items)
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

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Select Available Courier Boy from Branch *
              </label>
              
              {couriers.length === 0 ? (
                <p className="text-xs text-rose-400">No couriers available in this branch. Please add staff first.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {couriers.map((c) => (
                    <label 
                      key={c._id}
                      onClick={() => setSelectedCourierId(c._id)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                        selectedCourierId === c._id 
                          ? 'bg-blue-600/15 border-blue-500 text-slate-100 shadow-sm' 
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
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
                          <p className="text-xs font-bold">{c.firstName} {c.lastName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Emp ID: {c.employeeId} • {c.phone}</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">
                        Available
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <Button 
                variant="outline"
                onClick={() => setAssignModalOpen(false)}
                className="text-xs border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAssignCourier}
                disabled={submitting || !selectedCourierId}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5"
              >
                {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
