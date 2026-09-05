import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog } from '../../../components/ui/dialog';
import api from '../../../config/api';
import { useAuthStore } from '../../../store/authStore';
import { Toaster, toast } from 'sonner';
import { Box, Edit3, Warehouse } from 'lucide-react';

interface InventoryItem {
  _id: string;
  productId: {
    _id: string;
    productId: string;
    name: string;
    serialNumber: string;
    imei: string;
    rackNumber?: string;
    category?: {
      name: string;
    };
  };
  branchId?: {
    _id: string;
    name: string;
    code: string;
  };
  status: 'available' | 'reserved' | 'in_transit';
  assignedTo?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  updatedAt: string;
}

export const InventoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [rackFilter, setRackFilter] = useState<string>('all');

  // Rack Edit Modal States
  const [rackModalOpen, setRackModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [rackInput, setRackInput] = useState('');
  const [updatingRack, setUpdatingRack] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory', {
        params: {
          page,
          limit: 100,
          search,
          rackNumber: rackFilter !== 'all' ? rackFilter : undefined
        }
      });
      setItems(response.data.data || []);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (err: any) {
      toast.error('Failed to load inventory logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, search, rackFilter]);

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
      await api.put(`/products/${selectedItem.productId._id}`, {
        rackNumber: cleanRack
      });

      toast.success(`📦 Storage location updated to "${cleanRack}"`);
      setRackModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update rack location');
    } finally {
      setUpdatingRack(false);
    }
  };

  const isWarehouseManagerOrAdmin = 
    user?.role === 'super_admin' || 
    user?.role === 'warehouse_manager' || 
    user?.role === 'branch_admin' || 
    user?.role === 'store_manager';

  const columns: Column<InventoryItem>[] = [
    {
      header: 'Product ID',
      accessorKey: 'productId.productId',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-200">
          {item.productId?.productId}
        </span>
      )
    },
    {
      header: 'Asset Name',
      accessorKey: 'productId.name',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-100">{item.productId?.name}</span>
          <span className="text-[10px] text-slate-400">Category: {item.productId?.category?.name || 'Hardware'}</span>
        </div>
      )
    },
    {
      header: 'Serial / IMEI',
      accessorKey: 'productId.serialNumber',
      render: (item) => (
        <div className="flex flex-col font-mono text-[11px] text-slate-300">
          {item.productId?.serialNumber && <span>SN: {item.productId.serialNumber}</span>}
          {item.productId?.imei && <span className="text-slate-400">IMEI: {item.productId.imei}</span>}
          {!item.productId?.serialNumber && !item.productId?.imei && <span>N/A</span>}
        </div>
      )
    },
    {
      header: 'Warehouse Rack / Shelf',
      accessorKey: 'productId.rackNumber',
      render: (item) => {
        const rack = item.productId?.rackNumber || 'RACK-01';
        return (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/25">
              <Box className="h-3 w-3 mr-1 text-amber-400" />
              {rack}
            </span>
            {isWarehouseManagerOrAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenRackModal(item)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                title="Edit Storage Rack"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      }
    },
    {
      header: 'Current Branch',
      accessorKey: 'branchId.name',
      render: (item) => item.branchId ? `${item.branchId.name} (${item.branchId.code})` : 'Central Main Stock (PRN)'
    },
    {
      header: 'Staff Custody',
      accessorKey: 'assignedTo',
      render: (item) => item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName} (${item.assignedTo.employeeId})` : 'Warehouse Stock'
    },
    {
      header: 'Availability',
      accessorKey: 'status',
      render: (item) => (
        <Badge variant={item.status === 'available' ? 'success' : item.status === 'in_transit' ? 'info' : 'warning'} className="uppercase text-[10px]">
          {item.status}
        </Badge>
      )
    }
  ];

  const presetRacks = ['Rack 1', 'Rack 2', 'Rack 3', 'Rack A-1', 'Rack B-2', 'Godown Shelf 1'];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />
      
      <PageHeader 
        title="Warehouse Inventory & Storage Control" 
        subtitle="Live tracking of physical hardware assets, rack numbers, and shelf storage placement" 
      />

      {/* Rack Storage Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-1.5 mr-2 text-xs font-semibold text-slate-400">
          <Warehouse className="h-4 w-4 text-indigo-400" />
          <span>Filter by Rack Location:</span>
        </div>
        
        {['all', 'Rack 1', 'Rack 2', 'Rack 3', 'Rack A', 'Rack B'].map((r) => (
          <button
            key={r}
            onClick={() => setRackFilter(r)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              rackFilter === r
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {r === 'all' ? '📦 All Warehouse Racks' : `Rack: ${r}`}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchPlaceholder="Search product name, ID, serial number, or Rack No (e.g. Rack 1)..."
      />

      {/* Rack Update Dialog */}
      <Dialog 
        isOpen={rackModalOpen} 
        onClose={() => setRackModalOpen(false)} 
        title="Assign Warehouse Storage Rack / Bin Location"
      >
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
                <Box className="h-4 w-4 text-amber-400" />
                <span>Rack / Storage Location Code *</span>
              </label>
              <Input
                value={rackInput}
                onChange={(e) => setRackInput(e.target.value)}
                placeholder="e.g. Rack 1, Rack 2, Rack A-01, Bin 105"
                className="bg-slate-950 border-slate-800 font-mono text-amber-300 font-bold"
                required
              />
              <p className="text-[11px] text-slate-400">
                Specify exact physical shelf, rack number, or bin location inside the warehouse storage area.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400">Quick Location Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {presetRacks.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRackInput(preset)}
                    className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/30 border border-slate-700 text-[11px] font-mono text-slate-300 transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setRackModalOpen(false)}>
                Cancel
              </Button>
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
