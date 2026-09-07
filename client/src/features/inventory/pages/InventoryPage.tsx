import React, { useEffect, useState, useRef } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog } from '../../../components/ui/dialog';
import api from '../../../config/api';
import { useAuthStore } from '../../../store/authStore';
import { Toaster, toast } from 'sonner';
import { Box, Edit3, Warehouse, PackagePlus, Printer } from 'lucide-react';
import QRCodeSVG from 'react-qr-code';

interface InventoryItem {
  _id: string;
  productId: {
    _id: string;
    productId: string;
    name: string;
    serialNumber: string;
    imei: string;
    rackNumber?: string;
    qrCode?: string;
    model?: string;
    category?: { name: string };
  };
  branchId?: { _id: string; name: string; code: string };
  status: 'available' | 'reserved' | 'in_transit';
  assignedTo?: { firstName: string; lastName: string; employeeId: string };
  updatedAt: string;
}

interface AvailableProduct {
  _id: string;
  productId: string;
  name: string;
  serialNumber: string;
  imei: string;
  model?: string;
  rackNumber?: string;
  qrCode?: string;
  status: string;
  category?: { name: string };
}

export const InventoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [rackFilter, setRackFilter] = useState<string>('all');

  // Rack Edit Modal
  const [rackModalOpen, setRackModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [rackInput, setRackInput] = useState('');
  const [updatingRack, setUpdatingRack] = useState(false);

  // Receive Product Modal
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [receiveRack, setReceiveRack] = useState('RACK-01');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Sticker Modal
  const [stickerModalOpen, setStickerModalOpen] = useState(false);
  const [stickerProduct, setStickerProduct] = useState<AvailableProduct | null>(null);
  const stickerRef = useRef<HTMLDivElement>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory', {
        params: { page, limit: 100, search, rackNumber: rackFilter !== 'all' ? rackFilter : undefined }
      });
      setItems(response.data.data || []);
      setTotalPages(response.data.meta?.pages || 1);
    } catch {
      toast.error('Failed to load inventory logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, [page, search, rackFilter]);

  const fetchAvailableProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get('/products', { params: { limit: 500, status: 'available' } });
      setAvailableProducts(res.data?.data || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOpenReceiveModal = () => {
    setSelectedProductId('');
    setReceiveRack('RACK-01');
    setReceiveNotes('');
    setStickerProduct(null);
    fetchAvailableProducts();
    setReceiveModalOpen(true);
  };

  const handleReceiveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) { toast.error('Please select a product'); return; }
    setSaving(true);
    try {
      const rack = receiveRack.trim() || 'RACK-01';
      await api.put(`/products/${selectedProductId}`, { rackNumber: rack });
      toast.success('Product received and stored in warehouse!');
      const prod = availableProducts.find(p => p._id === selectedProductId);
      if (prod) { setStickerProduct({ ...prod, rackNumber: rack }); setStickerModalOpen(true); }
      setReceiveModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to receive product');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintSticker = () => {
    if (!stickerRef.current) return;
    const printContent = stickerRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=420,height=650');
    if (!win) return;
    win.document.write(`<html><head><title>Product Sticker</title>
    <style>body{margin:0;padding:16px;font-family:monospace;background:white;color:black;}*{box-sizing:border-box;}</style>
    </head><body onload="window.print()">${printContent}</body></html>`);
    win.document.close();
  };

  const handleOpenRackModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setRackInput(item.productId?.rackNumber || 'RACK-01');
    setRackModalOpen(true);
  };

  const handleSaveRackLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !selectedItem.productId?._id) return;
    try {
      setUpdatingRack(true);
      const cleanRack = rackInput.trim() || 'RACK-01';
      await api.put(`/products/${selectedItem.productId._id}`, { rackNumber: cleanRack });
      toast.success(`Storage location updated to "${cleanRack}"`);
      setRackModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update rack location');
    } finally {
      setUpdatingRack(false);
    }
  };

  const isWarehouseManagerOrAdmin =
    user?.role === 'super_admin' || user?.role === 'warehouse_manager' ||
    user?.role === 'branch_admin' || user?.role === 'store_manager';

  const columns: Column<InventoryItem>[] = [
    {
      header: 'Product ID', accessorKey: 'productId.productId',
      render: (item) => <span className="font-mono text-xs font-semibold text-slate-200">{item.productId?.productId}</span>
    },
    {
      header: 'Asset Name', accessorKey: 'productId.name',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-100">{item.productId?.name}</span>
          <span className="text-[10px] text-slate-400">Category: {item.productId?.category?.name || 'Hardware'}</span>
        </div>
      )
    },
    {
      header: 'Serial / IMEI', accessorKey: 'productId.serialNumber',
      render: (item) => (
        <div className="flex flex-col font-mono text-[11px] text-slate-300">
          {item.productId?.serialNumber && <span>SN: {item.productId.serialNumber}</span>}
          {item.productId?.imei && <span className="text-slate-400">IMEI: {item.productId.imei}</span>}
          {!item.productId?.serialNumber && !item.productId?.imei && <span>N/A</span>}
        </div>
      )
    },
    {
      header: 'Warehouse Rack / Shelf', accessorKey: 'productId.rackNumber',
      render: (item) => {
        const rack = item.productId?.rackNumber || 'RACK-01';
        return (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/25">
              <Box className="h-3 w-3 mr-1 text-amber-400" />{rack}
            </span>
            {isWarehouseManagerOrAdmin && (
              <Button variant="ghost" size="sm" onClick={() => handleOpenRackModal(item)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-amber-300 hover:bg-slate-800" title="Edit Storage Rack">
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      }
    },
    {
      header: 'Current Branch', accessorKey: 'branchId.name',
      render: (item) => item.branchId ? `${item.branchId.name} (${item.branchId.code})` : 'Central Main Stock (PRN)'
    },
    {
      header: 'Staff Custody', accessorKey: 'assignedTo',
      render: (item) => item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName} (${item.assignedTo.employeeId})` : 'Warehouse Stock'
    },
    {
      header: 'Availability', accessorKey: 'status',
      render: (item) => (
        <Badge variant={item.status === 'available' ? 'success' : item.status === 'in_transit' ? 'info' : 'warning'} className="uppercase text-[10px]">
          {item.status}
        </Badge>
      )
    }
  ];

  const presetRacks = ['Rack 1', 'Rack 2', 'Rack 3', 'Rack A-1', 'Rack B-2', 'Godown Shelf 1'];
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader
        title="Warehouse Inventory & Storage Control"
        subtitle="Live tracking of physical hardware assets, rack numbers, and shelf storage placement"
      >
        {(user?.role === 'warehouse_manager' || user?.role === 'super_admin' || user?.role === 'branch_admin') && (
          <Button onClick={handleOpenReceiveModal} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            <PackagePlus className="h-4 w-4" />
            <span>Receive Product from Truck</span>
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-1.5 mr-2 text-xs font-semibold text-slate-400">
          <Warehouse className="h-4 w-4 text-indigo-400" />
          <span>Filter by Rack Location:</span>
        </div>
        {['all', 'Rack 1', 'Rack 2', 'Rack 3', 'Rack A', 'Rack B'].map((r) => (
          <button key={r} onClick={() => setRackFilter(r)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${rackFilter === r
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'}`}>
            {r === 'all' ? '📦 All Warehouse Racks' : `Rack: ${r}`}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={items} isLoading={loading} searchValue={search}
        onSearchChange={setSearch} page={page} totalPages={totalPages} onPageChange={setPage}
        searchPlaceholder="Search product name, ID, serial number, or Rack No (e.g. Rack 1)..." />

      {/* RECEIVE PRODUCT MODAL */}
      <Dialog isOpen={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} title="Receive Product from Truck — Warehouse Entry">
        <form onSubmit={handleReceiveProduct} className="space-y-4 pt-2">
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <span className="text-emerald-400 text-lg">🚛</span>
            <div>
              <p className="text-xs font-bold text-emerald-300">STEP 1 — Warehouse Manager</p>
              <p className="text-[11px] text-emerald-400/70">Select product received from truck, assign rack, then print sticker to paste on box.</p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Select Product Received from Truck *</label>
            {loadingProducts ? (
              <div className="text-xs text-slate-400 animate-pulse p-2">Loading available products...</div>
            ) : (
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} required
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 cursor-pointer">
                <option value="">Select product to receive...</option>
                {availableProducts.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} — {p.productId}{p.serialNumber ? ` | SN: ${p.serialNumber}` : ''}{p.imei ? ` | IMEI: ${p.imei}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-300 flex items-center space-x-1">
              <Box className="h-4 w-4 text-amber-400" /><span>Assign Rack / Storage Location *</span>
            </label>
            <Input value={receiveRack} onChange={(e) => setReceiveRack(e.target.value)}
              placeholder="e.g. Rack 1, Rack A-01"
              className="bg-slate-950 border-slate-800 font-mono text-amber-300 font-bold" required />
            <div className="flex flex-wrap gap-1.5">
              {presetRacks.map((preset) => (
                <button key={preset} type="button" onClick={() => setReceiveRack(preset)}
                  className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700 text-[11px] font-mono text-slate-300 cursor-pointer">
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Notes (Optional)</label>
            <Input value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} placeholder="e.g. Received in good condition" />
          </div>
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setReceiveModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              {saving ? 'Saving...' : 'Receive & Generate Sticker'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* PRODUCT STICKER PRINT MODAL */}
      <Dialog isOpen={stickerModalOpen} onClose={() => setStickerModalOpen(false)} title="Product Warehouse Sticker — Ready to Print">
        {stickerProduct && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-400 text-center">Preview below. Click Print Sticker to print and paste on the product box.</p>
            <div ref={stickerRef} style={{ border: '2px solid #000', borderRadius: '8px', padding: '16px', width: '340px', margin: '0 auto', backgroundColor: 'white', color: 'black', fontFamily: 'monospace' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '8px', marginBottom: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '2px' }}>ARSHI ENTERPRISE</div>
                <div style={{ fontSize: '10px', color: '#555' }}>Warehouse Product Entry Tag</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <QRCodeSVG value={stickerProduct.qrCode || stickerProduct.productId || stickerProduct._id} size={90} />
              </div>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <span style={{ display: 'inline-block', background: '#000', color: '#fff', padding: '4px 14px', borderRadius: '4px', fontSize: '14px', fontWeight: '900', letterSpacing: '2px' }}>
                  {stickerProduct.rackNumber || 'RACK-01'}
                </span>
              </div>
              <div style={{ fontSize: '11px' }}>
                {[
                  ['Product Name', stickerProduct.name],
                  ['Product ID', stickerProduct.productId],
                  stickerProduct.serialNumber ? ['Serial No.', stickerProduct.serialNumber] : null,
                  stickerProduct.imei ? ['IMEI', stickerProduct.imei] : null,
                  stickerProduct.model ? ['Model', stickerProduct.model] : null,
                ].filter(Boolean).map(([label, value]: any) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ fontWeight: 'bold', textAlign: 'right', maxWidth: '180px' }}>{value}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #ddd', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase' }}>Received By</span>
                  <span style={{ fontWeight: 'bold' }}>{user?.firstName} {user?.lastName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase' }}>Date & Time</span>
                  <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{now}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '8px', color: '#aaa', borderTop: '1px solid #eee', paddingTop: '6px', marginTop: '10px' }}>
                Arshi Enterprise - Warehouse Management System
              </div>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <Button variant="outline" onClick={() => setStickerModalOpen(false)}>Close</Button>
              <Button onClick={handlePrintSticker} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                <Printer className="h-4 w-4" /><span>Print Sticker</span>
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* RACK UPDATE DIALOG */}
      <Dialog isOpen={rackModalOpen} onClose={() => setRackModalOpen(false)} title="Assign Warehouse Storage Rack / Bin Location">
        {selectedItem && (
          <form onSubmit={handleSaveRackLocation} className="space-y-4 pt-1">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400 font-semibold">Selected Hardware Asset:</p>
              <p className="text-slate-100 font-bold text-sm">{selectedItem.productId?.name}</p>
              <div className="flex items-center space-x-4 text-slate-400 font-mono text-[11px] pt-1">
                <span>ID: {selectedItem.productId?.productId}</span>
                {selectedItem.productId?.serialNumber && <span>SN: {selectedItem.productId.serialNumber}</span>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-300 flex items-center space-x-1">
                <Box className="h-4 w-4 text-amber-400" /><span>Rack / Storage Location Code *</span>
              </label>
              <Input value={rackInput} onChange={(e) => setRackInput(e.target.value)}
                placeholder="e.g. Rack 1, Rack 2, Rack A-01, Bin 105"
                className="bg-slate-950 border-slate-800 font-mono text-amber-300 font-bold" required />
              <p className="text-[11px] text-slate-400">Specify exact physical shelf, rack number, or bin location inside the warehouse.</p>
            </div>
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400">Quick Location Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {presetRacks.map((preset) => (
                  <button key={preset} type="button" onClick={() => setRackInput(preset)}
                    className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/30 border border-slate-700 text-[11px] font-mono text-slate-300 transition-colors cursor-pointer">
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setRackModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updatingRack} className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                {updatingRack ? 'Saving Location...' : 'Save Rack Location'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
};

export default InventoryPage;
