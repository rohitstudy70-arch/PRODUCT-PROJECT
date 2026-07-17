import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import QRCodeSVG from 'react-qr-code';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Plus, Trash, QrCode } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

interface Product {
  _id: string;
  productId: string;
  name: string;
  category: {
    _id: string;
    name: string;
    prefix: string;
  };
  serialNumber: string;
  imei: string;
  model: string;
  status: string;
  qrCode?: string;
  currentBranchId?: {
    _id: string;
    name: string;
  };
}

interface Category {
  _id: string;
  name: string;
}

interface Branch {
  _id: string;
  name: string;
}

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [imei, setImei] = useState('');
  const [model, setModel] = useState('');
  const [batch, setBatch] = useState('');
  const [vendor, setVendor] = useState('');
  const [currentBranchId, setCurrentBranchId] = useState('');
  const [notes, setNotes] = useState('');

  const { user } = useAuthStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const productResponse = await api.get('/products', {
        params: { page, limit: 10, search }
      });
      setProducts(productResponse.data.data);
      setTotalPages(productResponse.data.meta?.pages || 1);

      // Categories and Branches
      const catResponse = await api.get('/products/categories');
      setCategories(catResponse.data.data);

      const branchResponse = await api.get('/branches', { params: { limit: 100 } });
      setBranches(branchResponse.data.data);
    } catch (err: any) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const handleOpenCreateModal = () => {
    setName('');
    setCategoryId(categories[0]?._id || '');
    setSerialNumber('');
    setImei('');
    setModel('');
    setBatch('');
    setVendor('');
    setCurrentBranchId(branches[0]?._id || '');
    setNotes('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !categoryId || !currentBranchId) {
      toast.error('Product name, category, and location are required');
      return;
    }

    try {
      const payload = {
        name,
        categoryId,
        serialNumber,
        imei,
        model,
        batch,
        vendor,
        currentBranchId,
        notes
      };

      await api.post('/products', payload);
      toast.success('Product registered successfully');

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleGenerateQR = async (productId: string) => {
    try {
      const response = await api.post(`/products/${productId}/generate-qr`);
      const qrDoc = response.data.data;
      
      setQrCodeData(qrDoc.code);
      setQrModalOpen(true);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate product QR');
    }
  };

  const handleOpenQRView = (code: string) => {
    setQrCodeData(code);
    setQrModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this product?')) return;

    try {
      await api.delete(`/products/${id}`);
      toast.success('Product removed successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'in_transit': return 'info';
      case 'assigned': return 'warning';
      case 'missing': return 'destructive';
      default: return 'secondary';
    }
  };

  const columns: Column<Product>[] = [
    { header: 'Product ID', accessorKey: 'productId' },
    { header: 'Product Name', accessorKey: 'name' },
    { header: 'Category', accessorKey: 'category.name', render: (item) => item.category?.name },
    { header: 'Serial No', accessorKey: 'serialNumber' },
    { header: 'Branch Location', accessorKey: 'currentBranchId.name', render: (item) => item.currentBranchId ? item.currentBranchId.name : 'Main Organization' },
    {
      header: 'Status',
      accessorKey: 'status',
      render: (item) => (
        <Badge variant={getStatusVariant(item.status)} className="uppercase text-[10px]">
          {item.status.replace('_', ' ')}
        </Badge>
      )
    },
    {
      header: 'QR Tag',
      accessorKey: 'qrCode',
      render: (item) => (
        item.qrCode ? (
          <Button variant="ghost" size="sm" onClick={() => handleOpenQRView(item.qrCode!)} className="h-7 text-emerald-400 p-1">
            <QrCode className="h-4 w-4 mr-1" />
            <span>View</span>
          </Button>
        ) : (
          user?.role === 'super_admin' ? (
            <Button variant="outline" size="sm" onClick={() => handleGenerateQR(item._id)} className="h-7 text-xs border-indigo-500/30 text-indigo-400">
              Generate
            </Button>
          ) : <span className="text-xs text-slate-500">Unassigned</span>
        )
      )
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      render: (item) => (
        user?.role === 'super_admin' ? (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleDelete(item._id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : <span className="text-xs text-slate-500">None</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader title="Product Master Catalog" subtitle="Register trackable hardware and assign security tags">
        {user?.role === 'super_admin' && (
          <Button onClick={handleOpenCreateModal} className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={products}
        isLoading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchPlaceholder="Search by name, Product ID or Serial Number..."
      />

      {/* Creation Modal */}
      <Dialog isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register Product Asset">
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Product Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Arshi Smart GPS Tracker V2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-slate-400">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="" disabled>Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-slate-400">Initial Location (Branch) *</label>
              <select
                value={currentBranchId}
                onChange={(e) => setCurrentBranchId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="" disabled>Select Branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Serial Number</label>
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN980001" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">IMEI</label>
              <Input value={imei} onChange={(e) => setImei(e.target.value)} placeholder="IMEI9870001" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Model</label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="AR-GPS-V2" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Batch Code</label>
              <Input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="BATCH-2026" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Vendor</label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="A-Z Electronics" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Notes / Remarks</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter details..." />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Complete Registration</Button>
          </div>
        </form>
      </Dialog>

      {/* QR Viewer Dialog */}
      <Dialog isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Product Label Tag (QR Code)">
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <p className="text-xs text-slate-400 text-center uppercase tracking-wider font-semibold">
            Scan tag at exit/entry checkpoints to clear dispatch transfers
          </p>
          <div className="p-4 bg-white rounded-xl shadow-lg border border-slate-200">
            {qrCodeData && (
              <QRCodeSVG
                value={qrCodeData}
                size={220}
                level="M"
              />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-200">UUID Label ID</p>
            <p className="text-xs text-slate-500 font-mono select-all mt-1">{qrCodeData}</p>
          </div>
          <Button onClick={() => setQrModalOpen(false)} className="w-full mt-4">Close Label</Button>
        </div>
      </Dialog>
    </div>
  );
};
export default ProductListPage;
