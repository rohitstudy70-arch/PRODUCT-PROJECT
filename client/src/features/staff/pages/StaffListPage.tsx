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
import { Plus, Trash, QrCode, Edit, Printer } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

interface Staff {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  branchId?: {
    _id: string;
    name: string;
    code: string;
  };
  qrCode?: string;
  status: string;
}

interface Branch {
  _id: string;
  name: string;
}

export const StaffListPage: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  // Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'super_admin' | 'branch_admin' | 'store_manager' | 'security_guard' | 'staff'>('staff');
  const [branchId, setBranchId] = useState('');
  const [rfidCard, setRfidCard] = useState('');

  const { user } = useAuthStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const staffResponse = await api.get('/staff', {
        params: { page, limit: 10, search }
      });
      setStaffList(staffResponse.data.data);
      setTotalPages(staffResponse.data.meta?.pages || 1);

      // Fetch branches for assignment dropdown
      const branchResponse = await api.get('/branches', { params: { limit: 100 } });
      setBranches(branchResponse.data.data);
    } catch (err: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const handleOpenCreateModal = () => {
    setSelectedStaff(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('staff');
    setBranchId('');
    setRfidCard('');
    setModalOpen(true);
  };

  const handleEditStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setFirstName(staff.firstName);
    setLastName(staff.lastName);
    setEmail(staff.email);
    setPassword('');
    setPhone(staff.phone || '');
    setRole(staff.role as any);
    setBranchId(staff.branchId?._id || '');
    setRfidCard((staff as any).rfidCard || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || (!selectedStaff && !password)) {
      toast.error('First name, last name, email and password are required');
      return;
    }

    try {
      const payload = {
        firstName,
        lastName,
        email,
        phone,
        role,
        branchId: branchId || null,
        rfidCard: rfidCard || null,
        ...(password ? { password } : {})
      };

      if (selectedStaff) {
        await api.put(`/staff/${selectedStaff._id}`, payload);
        toast.success('Staff details updated successfully');
      } else {
        await api.post('/staff', payload);
        toast.success('Staff member onboarded successfully');
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save staff details');
    }
  };

  const handleGenerateQR = async (staffId: string) => {
    try {
      const response = await api.post(`/staff/${staffId}/generate-qr`);
      const qrDoc = response.data.data;
      
      const staffMember = staffList.find(s => s._id === staffId);
      if (staffMember) {
        setSelectedStaff(staffMember);
      }
      setQrCodeData(qrDoc.code);
      setQrModalOpen(true);
      fetchData(); // Refresh list to update QR status icon
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'QR Code generation failed');
    }
  };

  const handleOpenQRView = (staff: Staff, code: string) => {
    setSelectedStaff(staff);
    setQrCodeData(code);
    setQrModalOpen(true);
  };

  const handlePrintQR = () => {
    const printContent = document.getElementById('staff-qr-print-element');
    if (!printContent) return;

    const uniqueName = new Date().getTime();
    const windowName = 'PrintWindow_' + uniqueName;
    const printWindow = window.open('about:blank', windowName, 'left=50000,top=50000,width=0,height=0');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Staff ID Card</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              color: #000;
              background-color: #fff;
              text-align: center;
            }
            .card-container {
              border: 2px solid #333;
              border-radius: 12px;
              padding: 24px;
              width: 260px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              display: inline-block;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 2px;
              color: #1e3a8a;
              letter-spacing: 0.05em;
            }
            .subtitle {
              font-size: 9px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 16px;
              font-weight: bold;
            }
            .qr-wrapper {
              margin-bottom: 16px;
              display: flex;
              justify-content: center;
            }
            .qr-wrapper svg {
              width: 180px;
              height: 180px;
            }
            .name {
              font-size: 16px;
              font-weight: bold;
              margin-top: 8px;
            }
            .role {
              font-size: 11px;
              color: #4f46e5;
              text-transform: uppercase;
              font-weight: bold;
              margin-top: 2px;
              letter-spacing: 0.05em;
            }
            .emp-id {
              font-size: 10px;
              color: #888;
              font-family: monospace;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <div class="title">ARSHI ENTERPRISE</div>
            <div class="subtitle">Corporate Identity Card</div>
            <div class="qr-wrapper">
              ${printContent.innerHTML}
            </div>
            <div class="name">${selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : 'Staff Member'}</div>
            <div class="role">${selectedStaff ? selectedStaff.role.replace('_', ' ').toUpperCase() : ''}</div>
            <div class="emp-id">Emp ID: ${selectedStaff ? selectedStaff.employeeId : ''}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;

    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff member removed successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete staff');
    }
  };

  const columns: Column<Staff>[] = [
    { header: 'Emp ID', accessorKey: 'employeeId' },
    {
      header: 'Name',
      accessorKey: 'name',
      render: (item) => `${item.firstName} ${item.lastName}`
    },
    { header: 'Email', accessorKey: 'email' },
    {
      header: 'Role',
      accessorKey: 'role',
      render: (item) => (
        <Badge variant="secondary" className="uppercase text-[10px]">
          {item.role.replace('_', ' ')}
        </Badge>
      )
    },
    {
      header: 'Branch Assignment',
      accessorKey: 'branchId.name',
      render: (item) => item.branchId ? item.branchId.name : 'Central Head Office'
    },
    {
      header: 'QR Status',
      accessorKey: 'qrCode',
      render: (item) => (
        item.qrCode ? (
          <Button variant="ghost" size="sm" onClick={() => handleOpenQRView(item, item.qrCode!)} className="h-7 text-emerald-400 p-1">
            <QrCode className="h-4 w-4 mr-1" />
            <span className="text-xs">View</span>
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
            <Button variant="outline" size="sm" onClick={() => handleEditStaff(item)} className="h-8 w-8 p-0 text-indigo-400 hover:text-indigo-300">
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

      <PageHeader title="Staff Directory" subtitle="Manage permissions, branch assignments, and generate identity credentials">
        {user?.role === 'super_admin' && (
          <Button onClick={handleOpenCreateModal} className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Add Staff</span>
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={staffList}
        isLoading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchPlaceholder="Search by name, employee ID or email..."
      />

      {/* Creation/Edit Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Onboard Corporate Staff"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">First Name *</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Rahul" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Last Name *</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Kumar" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Email Address *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahul@arshi.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Mobile Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543213" />
            </div>
          </div>

          {!selectedStaff && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Portal Password *</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-slate-400">Security Access Role *</label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="staff">Courier Courier/Staff</option>
                <option value="security_guard">Security Guard Scanner</option>
                <option value="store_manager">Store Room Manager</option>
                <option value="branch_admin">Branch Administrator</option>
                <option value="super_admin">Organization Administrator</option>
              </select>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-slate-400">Branch Assignment</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Central Head Office</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">RFID Card UID / Tag Number</label>
            <Input value={rfidCard} onChange={(e) => setRfidCard(e.target.value)} placeholder="Tap RFID card on reader or type UID (e.g. 10293847)" />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Complete Onboarding</Button>
          </div>
        </form>
      </Dialog>

      {/* QR Code Viewer Modal */}
      <Dialog
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Staff Identity Card (QR Code)"
      >
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <p className="text-xs text-slate-400 text-center uppercase tracking-wider font-semibold">
            This QR code verifies user credentials at security check gates
          </p>
          <div id="staff-qr-print-element" className="p-4 bg-white rounded-xl shadow-lg border border-slate-200">
            {qrCodeData && (
              <QRCodeSVG
                value={qrCodeData}
                size={220}
                level="M"
              />
            )}
          </div>
          <div className="text-center">
            {selectedStaff && (
              <div className="mb-3">
                <p className="text-sm font-bold text-slate-200">{selectedStaff.firstName} {selectedStaff.lastName}</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">{selectedStaff.role.replace('_', ' ')}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Emp ID: {selectedStaff.employeeId}</p>
              </div>
            )}
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credential Token (UUID)</p>
            <p className="text-[10px] text-slate-500 font-mono select-all mt-1">{qrCodeData}</p>
          </div>
          
          <div className="flex w-full space-x-2 mt-4">
            <Button onClick={handlePrintQR} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center space-x-1.5 cursor-pointer">
              <Printer className="h-4 w-4" />
              <span>Print ID Card</span>
            </Button>
            <Button variant="outline" onClick={() => setQrModalOpen(false)} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
export default StaffListPage;
