import React, { useState, useEffect } from 'react';
import { 
  X, Package, MapPin, Truck, UserCheck, CheckCircle, Clock, Tag 
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import QRCodeSVG from 'react-qr-code';
import api from '../../../config/api';
import { toast } from 'sonner';
import { TransferConfirmationModal } from './TransferConfirmationModal';

interface ProductTransferPanelProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess: () => void;
  adminUser: any;
}

export const ProductTransferPanel: React.FC<ProductTransferPanelProps> = ({
  product,
  isOpen,
  onClose,
  onTransferSuccess,
  adminUser
}) => {
  const [activeTab, setActiveTab] = useState<'transfer' | 'history'>('transfer');
  const [branches, setBranches] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [selectedCourierDetails, setSelectedCourierDetails] = useState<any | null>(null);
  const [transferReason, setTransferReason] = useState('Branch Transfer');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [historyTimeline, setHistoryTimeline] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Transfer Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedTransferId, setGeneratedTransferId] = useState('');

  // Fetch branches and staff
  useEffect(() => {
    if (isOpen && product) {
      fetchBranches();
      fetchStaff();
      fetchHistory();
      generateTransferId();
    }
  }, [isOpen, product]);

  const generateTransferId = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    setGeneratedTransferId(`TRF-${year}-${rand}`);
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches', { params: { limit: 100 } });
      setBranches(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff', { params: { limit: 100 } });
      setStaffList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  };

  const fetchHistory = async () => {
    if (!product?._id) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/products/${product._id}/history`);
      setHistoryTimeline(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load product history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Auto-load courier details upon selecting courier dropdown
  useEffect(() => {
    if (selectedCourierId) {
      const found = staffList.find(s => s._id === selectedCourierId);
      setSelectedCourierDetails(found || null);
    } else {
      setSelectedCourierDetails(null);
    }
  }, [selectedCourierId, staffList]);

  if (!isOpen || !product) return null;

  const currentBranch = product.currentBranchId;
  const currentBranchIdStr = currentBranch
    ? (typeof currentBranch === 'object' ? currentBranch._id : currentBranch)
    : '';

  // Filter Active Branches excluding current branch
  const activeDestinationBranches = branches.filter(b => {
    if (b.status === 'inactive' || b.status === 'suspended') return false;
    if (currentBranchIdStr && b._id === currentBranchIdStr) return false;
    return true;
  });

  // Filter Active Couriers / Staff
  const availableCouriers = staffList.filter(s => {
    if (s.status === 'inactive' || s.status === 'suspended') return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-0.5 uppercase">Available</Badge>;
      case 'assigned':
        return <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-0.5 uppercase">Assigned</Badge>;
      case 'in_transit':
        return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-0.5 uppercase">In Transit</Badge>;
      case 'delivered':
        return <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs px-2.5 py-0.5 uppercase">Delivered</Badge>;
      case 'blocked':
        return <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs px-2.5 py-0.5 uppercase">Blocked</Badge>;
      case 'lost':
        return <Badge className="bg-slate-700/50 text-slate-300 border border-slate-600 text-xs px-2.5 py-0.5 uppercase">Lost</Badge>;
      default:
        return <Badge className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 uppercase">{status}</Badge>;
    }
  };

  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDestinationId) {
      toast.error('Please select a Destination Branch');
      return;
    }
    if (!selectedCourierId) {
      toast.error('Please select a Courier / Delivery Staff');
      return;
    }
    if (['blocked', 'lost', 'scrapped'].includes(product.status)) {
      toast.error(`Cannot transfer product in '${product.status.toUpperCase()}' state.`);
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    setSubmitting(true);
    try {
      const payload = {
        productId: product._id,
        destinationBranchId: selectedDestinationId,
        courierId: selectedCourierId,
        reason: transferReason,
        expectedDeliveryDate,
        remarks
      };

      const response = await api.post('/transfers/assign-imei', payload);
      toast.success(`Transfer ${response.data?.data?.transfer?.transferId || generatedTransferId} executed successfully!`);
      
      setConfirmModalOpen(false);
      onTransferSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to execute product transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const targetBranchDoc = branches.find(b => b._id === selectedDestinationId);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Sliding Drawer Content */}
      <div className="relative w-full max-w-2xl bg-slate-950 border-l border-slate-800 shadow-2xl h-full flex flex-col z-10 overflow-hidden">
        {/* Panel Top Header */}
        <div className="p-4 md:p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-100">{product.name}</h3>
                {getStatusBadge(product.status)}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                IMEI: <span className="text-indigo-400 font-bold">{product.imei || 'N/A'}</span> • ID: {product.productId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-6">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'transfer'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Product & Transfer Form</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Movement Timeline ({historyTimeline.length})</span>
          </button>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {activeTab === 'transfer' ? (
            <>
              {/* SECTION 1: PRODUCT DETAILS GRID */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Tag className="h-4 w-4 mr-1.5 text-indigo-400" />
                    Product Specification & Status
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Updated: {new Date(product.updatedAt || product.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">IMEI Number</span>
                    <p className="font-mono font-bold text-slate-100">{product.imei || 'N/A'}</p>
                  </div>
                  <div className="space-y-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Serial Number</span>
                    <p className="font-mono font-semibold text-slate-300">{product.serialNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Model Number</span>
                    <p className="font-semibold text-slate-200">{product.model || 'N/A'}</p>
                  </div>
                  <div className="space-y-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Rack Location</span>
                    <p className="font-mono text-amber-400 font-bold">{product.rackNumber || 'RACK-01'}</p>
                  </div>
                  <div className="space-y-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Category</span>
                    <p className="font-semibold text-slate-200">{product.category?.name || 'General Hardware'}</p>
                  </div>
                  <div className="space-y-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Purchase Date</span>
                    <p className="text-slate-300">
                      {product.purchaseDate ? new Date(product.purchaseDate).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* QR Code Tag Preview */}
                {product.qrCode && (
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="p-1 bg-white rounded">
                        <QRCodeSVG value={product.qrCode} size={40} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-300">Security Tag UUID</p>
                        <p className="text-[10px] font-mono text-slate-500 select-all">{product.qrCode}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 text-[10px]">
                      Scannable Tag
                    </Badge>
                  </div>
                )}
              </div>

              {/* SECTION 2: CURRENT LOCATION CARD */}
              <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <MapPin className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Current Branch Location</h4>
                  </div>
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                    Origin Base
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Branch Name</p>
                    <p className="text-sm font-bold text-slate-100 mt-0.5">
                      {currentBranch?.name || 'Central Head Office'}
                    </p>
                    <p className="text-[10px] text-indigo-400 font-mono font-semibold">
                      Code: {currentBranch?.code || 'PRN'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Contact / Manager</p>
                    <p className="font-semibold text-slate-200 mt-0.5">
                      {currentBranch?.contactPerson || currentBranch?.managerName || 'Operations Lead'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {currentBranch?.phone || 'N/A'}
                    </p>
                  </div>

                  <div className="col-span-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Full Branch Address</p>
                    <p className="text-slate-300 text-xs mt-0.5">
                      {typeof currentBranch?.address === 'object'
                        ? `${currentBranch.address.street || ''}, ${currentBranch.address.city || ''}, ${currentBranch.address.state || ''} - ${currentBranch.address.pincode || ''}`
                        : currentBranch?.address || 'Main Transport Hub, Central Office'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: INITIATE PRODUCT TRANSFER FORM */}
              <form onSubmit={handleOpenConfirmModal} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
                    <Truck className="h-4 w-4 mr-1.5 text-indigo-400" />
                    Assign Product & Destination Branch
                  </h4>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
                    Step 1 to 3 Flow
                  </Badge>
                </div>

                {/* STEP 1: SELECT DESTINATION BRANCH */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 flex items-center">
                    <span className="h-5 w-5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-400 text-[10px] font-bold flex items-center justify-center mr-1.5">1</span>
                    Select Destination Branch *
                  </label>
                  <select
                    value={selectedDestinationId}
                    onChange={(e) => setSelectedDestinationId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Select destination location...</option>
                    {activeDestinationBranches.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code}) - {typeof b.address === 'object' ? b.address.city : 'Active Branch'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* STEP 2: SELECT COURIER BOY / STAFF */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 flex items-center">
                    <span className="h-5 w-5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-400 text-[10px] font-bold flex items-center justify-center mr-1.5">2</span>
                    Select Courier Boy / Delivery Staff *
                  </label>
                  <select
                    value={selectedCourierId}
                    onChange={(e) => setSelectedCourierId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Select courier for transfer...</option>
                    {availableCouriers.map(s => (
                      <option key={s._id} value={s._id}>
                        {`${s.firstName} ${s.lastName} (${s.employeeId}) - ${s.designation || s.role}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* STEP 3: AUTO STAFF VERIFICATION CARD (LOADS AUTOMATICALLY) */}
                {selectedCourierDetails && (
                  <div className="bg-slate-950 border border-indigo-500/40 rounded-xl p-4 space-y-3 shadow-lg shadow-indigo-950/30">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          Auto Staff Verification Card
                        </span>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px]">
                        Verified Active Staff
                      </Badge>
                    </div>

                    <div className="flex items-start space-x-4">
                      {/* Avatar / Photo */}
                      <div className="h-16 w-16 rounded-xl bg-indigo-950 border border-indigo-500/30 text-indigo-400 font-bold text-xl flex items-center justify-center shrink-0 uppercase shadow-inner">
                        {selectedCourierDetails.avatar ? (
                          <img src={selectedCourierDetails.avatar} alt="Courier" className="h-full w-full object-cover rounded-xl" />
                        ) : (
                          `${selectedCourierDetails.firstName[0]}${selectedCourierDetails.lastName[0]}`
                        )}
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs flex-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Employee Name</span>
                          <p className="font-bold text-slate-100">{`${selectedCourierDetails.firstName} ${selectedCourierDetails.lastName}`}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Employee ID</span>
                          <p className="font-mono text-indigo-400 font-semibold">{selectedCourierDetails.employeeId}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Father Name</span>
                          <p className="text-slate-300">{selectedCourierDetails.fatherName || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Mobile Number</span>
                          <p className="font-mono text-slate-200">{selectedCourierDetails.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Alternate Mobile</span>
                          <p className="font-mono text-slate-400">{selectedCourierDetails.alternatePhone || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Designation</span>
                          <p className="text-slate-300 font-semibold">{selectedCourierDetails.designation || 'Delivery Courier'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Aadhar Number</span>
                          <p className="font-mono text-slate-400">{selectedCourierDetails.aadharNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">PAN Number</span>
                          <p className="font-mono text-slate-400">{selectedCourierDetails.panNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Joining Date</span>
                          <p className="text-slate-300">{selectedCourierDetails.joiningDate ? new Date(selectedCourierDetails.joiningDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TRANSFER METADATA & REASON */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Transfer Reason *</label>
                    <select
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Branch Transfer">Branch Transfer</option>
                      <option value="New Stock">New Stock</option>
                      <option value="Customer Delivery">Customer Delivery</option>
                      <option value="Replacement">Replacement</option>
                      <option value="Repair">Repair</option>
                      <option value="Service">Service</option>
                      <option value="Warehouse Transfer">Warehouse Transfer</option>
                      <option value="Return">Return</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Expected Delivery Date *</label>
                    <Input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="h-10 bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* REMARKS TEXTAREA */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-semibold text-slate-400">Remarks / Instructions</label>
                    <span className="text-[10px] text-slate-500">{remarks.length}/500</span>
                  </div>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
                    placeholder="Enter dispatch notes, packaging details, or transport instructions..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* SUMMARY & SUBMIT */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={!selectedDestinationId || !selectedCourierId}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold h-12 rounded-xl shadow-lg shadow-indigo-950/60 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Proceed to Confirm Transfer</span>
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* MOVEMENT TIMELINE HISTORIES */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Audit Log & Movement History
                </h4>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 text-xs">
                  Immutable Record
                </Badge>
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-indigo-500 mx-auto mb-2" />
                  <p className="text-xs">Loading movement logs...</p>
                </div>
              ) : historyTimeline.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-1">
                  <Clock className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No History Records</p>
                  <p className="text-xs text-slate-500">Initial registration complete. No branch transfers recorded yet.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-800 ml-4 space-y-6 py-2">
                  {historyTimeline.map((item, idx) => (
                    <div key={item._id || idx} className="relative pl-6">
                      {/* Bullet Icon */}
                      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-300 uppercase tracking-wider text-[11px]">
                            {item.action ? item.action.replace('_', ' ') : 'Movement'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.timestamp || item.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-slate-300 font-medium">{item.notes || 'Status updated'}</p>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-1 font-mono">
                          {item.fromBranchId && <span>From: {item.fromBranchId.name}</span>}
                          {item.toBranchId && <span>To: {item.toBranchId.name}</span>}
                          {item.staffId && <span>Staff: {item.staffId.firstName} {item.staffId.lastName}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION POPUP MODAL */}
      <TransferConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleExecuteTransfer}
        loading={submitting}
        product={product}
        destinationBranch={targetBranchDoc}
        courier={selectedCourierDetails}
        transferId={generatedTransferId}
        reason={transferReason}
        expectedDeliveryDate={expectedDeliveryDate}
        remarks={remarks}
        adminName={`${adminUser?.firstName || 'Admin'} ${adminUser?.lastName || ''}`}
      />
    </div>
  );
};
