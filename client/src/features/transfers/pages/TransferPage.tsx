import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { QRScanner } from '../../../components/shared/QRScanner';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Plus, AlertCircle, Eye, Scan } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

interface Transfer {
  _id: string;
  transferId: string;
  fromBranchId: { _id: string; name: string };
  toBranchId: { _id: string; name: string };
  assignedStaffId: { _id: string; firstName: string; lastName: string; employeeId: string };
  status: string;
  totalItems: number;
  createdAt: string;
  approvedAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  arrivedAt?: string;
}

interface TransferDetail extends Transfer {
  items: {
    productId: {
      _id: string;
      productId: string;
      name: string;
      serialNumber: string;
      qrCode: string;
    };
    status: 'pending' | 'scanned' | 'dispatched' | 'received' | 'missing';
  }[];
}

export const TransferPage: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  // Detail / Scan states
  const [selectedTransfer, setSelectedTransfer] = useState<TransferDetail | null>(null);

  // Form creation states
  const [branches, setBranches] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [showCameraInModal, setShowCameraInModal] = useState(false);

  const { user } = useAuthStore();

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transfers', {
        params: { page, limit: 10, status: statusFilter || undefined }
      });
      setTransfers(response.data.data);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (err: any) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormMetadata = async () => {
    try {
      const brRes = await api.get('/branches', { params: { limit: 100 } });
      setBranches(brRes.data.data);

      const stRes = await api.get('/staff', { params: { limit: 100, role: 'staff' } });
      setStaffList(stRes.data.data);

      const prRes = await api.get('/products', { params: { limit: 100, status: 'available' } });
      setProducts(prRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [page, statusFilter]);

  useEffect(() => {
    if (createModalOpen) {
      fetchFormMetadata();
    }
  }, [createModalOpen]);

  const handleOpenCreateModal = () => {
    setFromBranchId('');
    setToBranchId('');
    setAssignedStaffId('');
    setSelectedProductIds([]);
    setNotes('');
    setScanInput('');
    setShowCameraInModal(false);
    setCreateModalOpen(true);
  };

  const handleAddProductByScan = (scannedCode: string) => {
    if (!fromBranchId) {
      toast.error('Please select a Source Branch first');
      return;
    }

    const matchedProduct = products.find(p => 
      (p.currentBranchId && (p.currentBranchId === fromBranchId || p.currentBranchId._id === fromBranchId)) &&
      (p.qrCode === scannedCode || p.serialNumber === scannedCode || p.productId === scannedCode) &&
      p.status === 'available'
    );

    if (!matchedProduct) {
      toast.error('Product not found, already assigned, or not available in source branch.');
      return;
    }

    if (selectedProductIds.includes(matchedProduct._id)) {
      toast.warning('Product already added');
      return;
    }

    setSelectedProductIds(prev => [...prev, matchedProduct._id]);
    toast.success(`Added product: ${matchedProduct.productId}`);
    setScanInput('');
    setShowCameraInModal(false);
  };


  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromBranchId || !toBranchId || !assignedStaffId || selectedProductIds.length === 0) {
      toast.error('Please fill in all required fields and select at least one product');
      return;
    }

    if (fromBranchId === toBranchId) {
      toast.error('Source and Destination branches must be different');
      return;
    }

    try {
      await api.post('/transfers', {
        fromBranchId,
        toBranchId,
        assignedStaffId,
        productIds: selectedProductIds,
        notes
      });
      toast.success('Transfer request logged successfully');
      setCreateModalOpen(false);
      fetchTransfers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create transfer');
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const response = await api.get(`/transfers/${id}`);
      setSelectedTransfer(response.data.data);
      setDetailModalOpen(true);
    } catch (err: any) {
      toast.error('Failed to retrieve transfer details');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/transfers/${id}/approve`);
      toast.success('Transfer approved successfully');
      setDetailModalOpen(false);
      fetchTransfers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleOpenStoreRoomScan = async (transfer: TransferDetail) => {
    setSelectedTransfer(transfer);
    setDetailModalOpen(false);
    setScanModalOpen(true);
  };

  const handleStoreRoomScan = async (scannedCode: string) => {
    if (!selectedTransfer) return;

    try {
      const response = await api.post('/transfers/dispatch-prepare', {
        transferId: selectedTransfer._id,
        productQrCode: scannedCode
      });

      toast.success(response.data.message);

      // Refresh Detail model to show checkmarks
      const detailRes = await api.get(`/transfers/${selectedTransfer._id}`);
      setSelectedTransfer(detailRes.data.data);

      if (response.data.data?.readyForDispatch) {
        toast.success('All items scanned! Ready for dispatch gate exit.');
        setScanModalOpen(false);
        fetchTransfers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to scan item');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'info';
      case 'preparing': return 'warning';
      case 'ready_for_dispatch': return 'info';
      case 'in_transit': return 'warning';
      case 'received': return 'success';
      default: return 'secondary';
    }
  };

  const columns: Column<Transfer>[] = [
    { header: 'Transfer ID', accessorKey: 'transferId' },
    { header: 'From Branch', accessorKey: 'fromBranchId.name', render: (item) => item.fromBranchId?.name },
    { header: 'To Branch', accessorKey: 'toBranchId.name', render: (item) => item.toBranchId?.name },
    { header: 'Assigned Driver', accessorKey: 'assignedStaffId', render: (item) => item.assignedStaffId ? `${item.assignedStaffId.firstName} ${item.assignedStaffId.lastName}` : 'Unassigned' },
    { header: 'Items Count', accessorKey: 'totalItems' },
    {
      header: 'Logistics Status',
      accessorKey: 'status',
      render: (item) => (
        <Badge variant={getStatusVariant(item.status)} className="uppercase text-[10px]">
          {item.status.replace(/_/g, ' ')}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      render: (item) => (
        <Button variant="outline" size="sm" onClick={() => handleViewDetail(item._id)} className="h-8 flex items-center space-x-1">
          <Eye className="h-4 w-4" />
          <span>View</span>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader title="Logistical Transfers" subtitle="Oversee dispatch logs, route status, and entry clearance checkpoints">
        {user?.role === 'super_admin' && (
          <Button onClick={handleOpenCreateModal} className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Create Transfer</span>
          </Button>
        )}
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        <Button variant={statusFilter === '' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('')}>All</Button>
        <Button variant={statusFilter === 'pending' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('pending')}>Pending Approval</Button>
        <Button variant={statusFilter === 'approved' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('approved')}>Approved</Button>
        <Button variant={statusFilter === 'preparing' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('preparing')}>Preparing</Button>
        <Button variant={statusFilter === 'ready_for_dispatch' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('ready_for_dispatch')}>Ready For Exit</Button>
        <Button variant={statusFilter === 'in_transit' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('in_transit')}>In Transit</Button>
        <Button variant={statusFilter === 'received' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('received')}>Received</Button>
      </div>

      <DataTable
        columns={columns}
        data={transfers}
        isLoading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Creation Modal */}
      <Dialog isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Initiate Logistics Asset Transfer">
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-slate-400">Source Branch *</label>
              <select
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select source</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-slate-400">Destination Branch *</label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select destination</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-slate-400">Assigned Delivery Courier / Staff *</label>
            <select
              value={assignedStaffId}
              onChange={(e) => setAssignedStaffId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              disabled={!fromBranchId}
            >
              <option value="">{!fromBranchId ? 'Select Source Branch First' : 'Select Driver'}</option>
              {staffList
                .filter(s => s.branchId && (s.branchId === fromBranchId || s.branchId._id === fromBranchId))
                .map(s => (
                  <option key={s._id} value={s._id}>{`${s.firstName} ${s.lastName} (${s.employeeId})`}</option>
                ))}
            </select>
          </div>

          {/* Scan / Dropdown Products Selection */}
          <div className="flex flex-col space-y-3 border border-slate-800 bg-slate-900/40 rounded-lg p-3">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-slate-400">Select Available Devices at Source Branch</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddProductByScan(e.target.value);
                    e.target.value = ''; // Reset selection
                  }
                }}
                disabled={!fromBranchId}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-visible:ring-indigo-500 cursor-pointer"
              >
                <option value="">Select product to add...</option>
                {products
                  .filter(p => p.currentBranchId && (p.currentBranchId === fromBranchId || p.currentBranchId._id === fromBranchId) && p.status === 'available')
                  .map(p => (
                    <option key={p._id} value={p.productId}>
                      {`${p.name} (${p.productId} | SN: ${p.serialNumber || 'N/A'})`}
                    </option>
                  ))
                }
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-slate-400">Or Scan Product QR / Serial Code (Warehouse Box)</label>
            </div>
            <div className="flex space-x-2">
              <Input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or type QR code / Serial No."
                className="bg-slate-950 border-slate-800"
                disabled={!fromBranchId}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (scanInput.trim()) {
                      handleAddProductByScan(scanInput.trim());
                    }
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline" 
                disabled={!fromBranchId}
                onClick={() => {
                  if (scanInput.trim()) {
                    handleAddProductByScan(scanInput.trim());
                  } else {
                    setShowCameraInModal(!showCameraInModal);
                  }
                }}
              >
                {scanInput.trim() ? 'Add' : 'Camera'}
              </Button>
            </div>

            {/* Inline Camera QRScanner */}
            {showCameraInModal && fromBranchId && (
              <div className="border border-slate-800 rounded-lg overflow-hidden p-2 bg-slate-950/60">
                <QRScanner
                  onScanSuccess={(code) => handleAddProductByScan(code)}
                  placeholder="Scan product tag"
                />
              </div>
            )}

            {/* List of Scanned/Added Products */}
            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Products to Transfer ({selectedProductIds.length})</label>
              <div className="max-h-32 overflow-y-auto space-y-1.5 mt-1.5 pr-1">
                {selectedProductIds.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No products scanned yet. Scan products from box to add.</p>
                ) : (
                  selectedProductIds.map((id) => {
                    const p = products.find(prod => prod._id === id);
                    if (!p) return null;
                    return (
                      <div key={p._id} className="flex items-center justify-between p-2 bg-slate-950/60 rounded border border-slate-850 text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {p.productId} | SN: {p.serialNumber || 'N/A'}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProductIds(prev => prev.filter(pId => pId !== id))}
                          className="h-6 text-red-400 hover:text-red-350 px-2"
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Logistical Notes / Instructions</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fragile, handle with care" />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit">Log Logistical Transfer</Button>
          </div>
        </form>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Logistics Transfer Manifest">
        {selectedTransfer && (
          <div className="space-y-4 pt-2 text-slate-200">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
              <div>
                <p className="text-slate-400 font-semibold">Route Code</p>
                <p className="font-mono text-slate-100">{selectedTransfer.transferId}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">Current Logistics Status</p>
                <Badge variant={getStatusVariant(selectedTransfer.status)} className="mt-0.5 uppercase">
                  {selectedTransfer.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="mt-2">
                <p className="text-slate-400 font-semibold">Origin Warehouse</p>
                <p className="text-slate-100">{selectedTransfer.fromBranchId?.name}</p>
              </div>
              <div className="mt-2">
                <p className="text-slate-400 font-semibold">Destination Location</p>
                <p className="text-slate-100">{selectedTransfer.toBranchId?.name}</p>
              </div>
              <div className="mt-2 col-span-2 border-t border-slate-850 pt-2">
                <p className="text-slate-400 font-semibold">Assigned Courier Staff</p>
                <p className="text-slate-100">
                  {selectedTransfer.assignedStaffId
                    ? `${selectedTransfer.assignedStaffId.firstName} ${selectedTransfer.assignedStaffId.lastName} (${selectedTransfer.assignedStaffId.employeeId})`
                    : 'Unassigned'}
                </p>
              </div>

              <div className="mt-2 col-span-2 border-t border-slate-850 pt-2 space-y-1.5">
                <p className="text-slate-400 font-semibold mb-1">Logistical Timestamps</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-850/80">
                  <div>
                    <span className="text-slate-500 font-bold">CREATED:</span>
                    <p className="font-mono mt-0.5">{selectedTransfer.createdAt ? new Date(selectedTransfer.createdAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">APPROVED:</span>
                    <p className="font-mono mt-0.5">{selectedTransfer.approvedAt ? new Date(selectedTransfer.approvedAt as string).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 font-bold">DISPATCHED:</span>
                    <p className="font-mono mt-0.5">{selectedTransfer.dispatchedAt ? new Date(selectedTransfer.dispatchedAt as string).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 font-bold">RECEIVED:</span>
                    <p className="font-mono mt-0.5">{(selectedTransfer.arrivedAt || selectedTransfer.receivedAt) ? new Date((selectedTransfer.arrivedAt || selectedTransfer.receivedAt) as string).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product list */}
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Item Manifest List ({selectedTransfer.items?.length || 0})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedTransfer.items?.map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-xs font-bold text-slate-200">{item.productId?.name || 'Unknown Product'}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: {item.productId?.productId || 'N/A'} | SN: {item.productId?.serialNumber || 'N/A'}
                      </p>
                    </div>
                    <Badge variant={item.status === 'scanned' ? 'success' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
              <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Close</Button>
              
              {user?.role === 'super_admin' && selectedTransfer.status === 'pending' && (
                <Button onClick={() => handleApprove(selectedTransfer._id)}>Approve Transfer</Button>
              )}

              {/* Store manager or courier staff scan dispatch preparation */}
              {(user?.role === 'store_manager' || user?.role === 'super_admin' || user?.role === 'staff') && 
                ['approved', 'preparing'].includes(selectedTransfer.status) && (
                  <Button onClick={() => handleOpenStoreRoomScan(selectedTransfer)} className="flex items-center space-x-1">
                    <Scan className="h-4 w-4" />
                    <span>Scan Warehouse Pickup</span>
                  </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* QR scanner camera prep Modal */}
      <Dialog isOpen={scanModalOpen} onClose={() => setScanModalOpen(false)} title="Warehouse Asset Pickup Verification">
        <div className="space-y-4 pt-2">
          <div className="flex items-center space-x-2 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-xs text-indigo-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Verification Staging: Scan product QR tags from warehouse boxes to confirm pickup.</span>
          </div>

          {selectedTransfer && (
            <div className="text-center text-sm font-semibold text-slate-300">
              Scan items for Transfer ID: <span className="font-mono text-white">{selectedTransfer.transferId}</span>
            </div>
          )}

          <QRScanner
            onScanSuccess={handleStoreRoomScan}
            placeholder="Scan Product QR or Serial Code"
            active={scanModalOpen}
          />

          <Button variant="outline" onClick={() => setScanModalOpen(false)} className="w-full mt-2">
            Close Scanner
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
export default TransferPage;
