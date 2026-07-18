import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Plus, Trash, Edit } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

interface Branch {
  _id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  contactPerson: string;
  status: 'active' | 'inactive' | 'suspended';
}

export const BranchListPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const { user } = useAuthStore();

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/branches`, {
        params: { page, limit: 10, search }
      });
      setBranches(response.data.data);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (err: any) {
      toast.error('Failed to retrieve branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [page, search]);

  const handleOpenCreateModal = () => {
    setEditBranch(null);
    setName('');
    setCode('');
    setEmail('');
    setPhone('');
    setStreet('');
    setCity('');
    setState('');
    setPincode('');
    setContactPerson('');
    setStatus('active');
    setAdminEmail('');
    setAdminPassword('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditBranch(branch);
    setName(branch.name);
    setCode(branch.code);
    setEmail(branch.email || '');
    setPhone(branch.phone || '');
    setStreet(branch.address?.street || '');
    setCity(branch.address?.city || '');
    setState(branch.address?.state || '');
    setPincode(branch.address?.pincode || '');
    setContactPerson(branch.contactPerson || '');
    setStatus(branch.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !code || !city || !state) {
      toast.error('Name, Code, City, and State are required');
      return;
    }

    if (!editBranch && (!adminEmail || !adminPassword)) {
      toast.error('Branch Admin Email and Password are required');
      return;
    }

    try {
      const payload = {
        name,
        code: code.toUpperCase(),
        email,
        phone,
        address: { street, city, state, country: 'India', pincode },
        contactPerson,
        status,
        adminEmail,
        adminPassword
      };

      if (editBranch) {
        await api.put(`/branches/${editBranch._id}`, payload);
        toast.success('Branch details updated successfully');
      } else {
        await api.post('/branches', payload);
        toast.success('New branch registered successfully');
      }

      setModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save branch');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;

    try {
      await api.delete(`/branches/${id}`);
      toast.success('Branch removed successfully');
      fetchBranches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  const columns: Column<Branch>[] = [
    { header: 'Code', accessorKey: 'code' },
    { header: 'Branch Name', accessorKey: 'name' },
    { header: 'City', accessorKey: 'address.city', render: (item) => item.address?.city },
    { header: 'Contact Person', accessorKey: 'contactPerson' },
    {
      header: 'Status',
      accessorKey: 'status',
      render: (item) => (
        <Badge variant={item.status === 'active' ? 'success' : item.status === 'suspended' ? 'destructive' : 'secondary'}>
          {item.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      render: (item) => (
        user?.role === 'super_admin' ? (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(item)} className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
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
      
      <PageHeader title="Branch Management" subtitle="Configure and list corporate warehouses and retail stores">
        {user?.role === 'super_admin' && (
          <Button onClick={handleOpenCreateModal} className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Add Branch</span>
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={branches}
        isLoading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchPlaceholder="Search by name, code or city..."
      />

      {/* Creation/Edit Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBranch ? 'Edit Branch Details' : 'Register New Branch'}
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Branch Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patna Hub" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Unique Code *</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PATNA" disabled={!!editBranch} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patna@arshi.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Contact Number</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999988001" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Street Address</label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Kankarbagh Colony" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">City *</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Patna" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">State *</label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Bihar" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Pincode</label>
              <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="800020" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Contact Person</label>
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Sanjay Singh" />
            </div>
            {editBranch && (
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-400">Status</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}
          </div>

          {!editBranch && (
            <div className="border-t border-slate-850 pt-3 mt-3 space-y-3">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Branch Admin Login Setup</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 text-foreground">Admin Email / Username *</label>
                  <Input 
                    type="email" 
                    value={adminEmail} 
                    onChange={(e) => setAdminEmail(e.target.value)} 
                    placeholder="ranchi.admin@arshi.com" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 text-foreground">Admin Password *</label>
                  <Input 
                    type="password" 
                    value={adminPassword} 
                    onChange={(e) => setAdminPassword(e.target.value)} 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Branch</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
export default BranchListPage;
