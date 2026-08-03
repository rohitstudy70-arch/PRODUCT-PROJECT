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
import { Plus, Trash, QrCode, Edit, Printer, CreditCard, Sparkles } from 'lucide-react';
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
  rfidCard?: string;
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
  const [quickRfidModalOpen, setQuickRfidModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [quickRfidValue, setQuickRfidValue] = useState('');

  // Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'super_admin' | 'branch_admin' | 'store_manager' | 'security_guard' | 'staff'>('staff');
  const [branchId, setBranchId] = useState('');
  const [rfidCard, setRfidCard] = useState('');
  
  // Courier Verification Profile fields matching user screenshot
  const [fatherName, setFatherName] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [designation, setDesignation] = useState('Delivery Staff / Courier');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('Bihar');
  const [pincode, setPincode] = useState('');

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
    setFatherName('');
    setAlternatePhone('');
    setAadharNumber('');
    setPanNumber('');
    setDesignation('Delivery Staff / Courier');
    setStreet('');
    setDistrict('');
    setStateName('Bihar');
    setPincode('');
    setModalOpen(true);
  };

  const handleEditStaff = (staff: any) => {
    setSelectedStaff(staff);
    setFirstName(staff.firstName || '');
    setLastName(staff.lastName || '');
    setEmail(staff.email || '');
    setPassword('');
    setPhone(staff.phone || '');
    setRole(staff.role as any);
    setBranchId(staff.branchId?._id || '');
    setRfidCard(staff.rfidCard || '');
    setFatherName(staff.fatherName || '');
    setAlternatePhone(staff.alternatePhone || '');
    setAadharNumber(staff.aadharNumber || '');
    setPanNumber(staff.panNumber || '');
    setDesignation(staff.designation || 'Delivery Staff / Courier');
    setStreet(staff.addressDetails?.street || '');
    setDistrict(staff.addressDetails?.district || '');
    setStateName(staff.addressDetails?.state || 'Bihar');
    setPincode(staff.addressDetails?.pincode || '');
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
        fatherName,
        alternatePhone,
        aadharNumber,
        panNumber,
        designation,
        addressDetails: {
          street,
          district,
          state: stateName,
          pincode
        },
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

  const handleOpenQuickRfid = (staff: Staff) => {
    setSelectedStaff(staff);
    setQuickRfidValue(staff.rfidCard || '');
    setQuickRfidModalOpen(true);
  };

  const handleSaveQuickRfid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      await api.put(`/staff/${selectedStaff._id}`, {
        rfidCard: quickRfidValue.trim() || null
      });
      toast.success(`RFID Card assigned to ${selectedStaff.firstName} ${selectedStaff.lastName}`);
      setQuickRfidModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update RFID Card');
    }
  };

  const handlePrintQR = () => {
    const printContent = document.getElementById('staff-qr-print-element-hidden');
    if (!printContent || !selectedStaff) return;

    const uniqueName = new Date().getTime();
    const windowName = 'PrintWindow_' + uniqueName;
    
    // Open print window centered and visible for previewing
    const printWindow = window.open('', windowName, 'width=700,height=550,top=100,left=100');
    if (!printWindow) return;

    const getDesignation = (role: string) => {
      switch(role) {
        case 'staff': return 'Logistics Courier';
        case 'security_guard': return 'Gate Security Officer';
        case 'store_manager': return 'Inventory Manager';
        case 'branch_admin': return 'Branch Administrator';
        case 'super_admin': return 'HQ Administrator';
        default: return 'Staff Member';
      }
    };

    const designationName = selectedStaff.designation || getDesignation(selectedStaff.role);
    const joinedDate = new Date(selectedStaff.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Staff ID Card - ${selectedStaff.firstName}</title>
          <style>
            @media print {
              body {
                background: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-btn {
                display: none !important;
              }
              .id-card-front, .id-card-back {
                box-shadow: none !important;
                border: 0.5px solid #94a3b8 !important; /* light outline for clean cutting */
              }
            }
            body {
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #0f172a;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .print-btn {
              background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
              color: white;
              border: none;
              padding: 10px 24px;
              font-size: 14px;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
              margin-bottom: 25px;
              box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .print-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
            }
            
            .cards-wrapper {
              display: flex;
              gap: 8mm;
              align-items: center;
              justify-content: center;
            }
            
            /* CR80 Standard dimensions: 54mm width x 85.6mm height (Vertical orientation) */
            .id-card-front, .id-card-back {
              width: 54mm;
              height: 85.6mm;
              background-color: #ffffff;
              color: #1e293b;
              border-radius: 3.18mm; /* standard CR80 rounded corners */
              border: 1px solid #e2e8f0;
              position: relative;
              overflow: hidden;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.4);
              page-break-inside: avoid;
            }
            
            /* Geometric background shapes */
            .bg-shape-top {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 40%;
              background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%);
              clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);
              z-index: 1;
            }
            .bg-shape-accent1 {
              position: absolute;
              top: 33%;
              left: -10%;
              width: 120%;
              height: 8%;
              background: #00b4d8;
              transform: rotate(-12deg);
              z-index: 2;
            }
            .bg-shape-accent2 {
              position: absolute;
              bottom: -5%;
              right: -10%;
              width: 70%;
              height: 30%;
              background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%);
              clip-path: polygon(100% 100%, 0 100%, 100% 0);
              z-index: 1;
            }
            .bg-shape-accent3 {
              position: absolute;
              bottom: 10%;
              right: 15%;
              width: 25px;
              height: 150px;
              background: #00b4d8;
              transform: rotate(45deg);
              z-index: 0;
              opacity: 0.15;
            }
            
            /* Back card specific shapes */
            .bg-shape-top-back {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 22%;
              background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%);
              clip-path: polygon(0 0, 100% 0, 100% 70%, 0 100%);
              z-index: 1;
            }
            
            /* Typography & Layout Elements */
            .logo-area {
              display: flex;
              align-items: center;
              gap: 4px;
              margin-top: 5mm;
              z-index: 10;
            }
            .logo-icon {
              width: 2.2mm;
              height: 2.2mm;
              border-radius: 50%;
              border: 1.5px solid #00b4d8;
              position: relative;
            }
            .logo-icon::after {
              content: '';
              position: absolute;
              top: 0.5px;
              left: 0.5px;
              width: 0.8mm;
              height: 0.8mm;
              background-color: #00b4d8;
              border-radius: 50%;
            }
            .logo-text {
              font-size: 7.5pt;
              font-weight: 900;
              color: #ffffff;
              letter-spacing: 0.8px;
              text-transform: uppercase;
            }
            
            .photo-container {
              width: 24mm;
              height: 29mm;
              border: 1.5px solid #ffffff;
              background-color: #f1f5f9;
              margin-top: 3.5mm;
              z-index: 10;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .avatar-icon {
              color: #cbd5e1;
              width: 15mm;
              height: 15mm;
            }
            
            .name-pill {
              background-color: #0b132b;
              color: #ffffff;
              font-size: 7.5pt;
              font-weight: 800;
              padding: 1.2mm 4mm;
              border-radius: 4mm;
              margin-top: 3mm;
              z-index: 10;
              text-align: center;
              width: 80%;
              text-transform: uppercase;
              box-shadow: 0 3px 6px rgba(0,0,0,0.15);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .role-pill {
              background-color: #00b4d8;
              color: #ffffff;
              font-size: 5.5pt;
              font-weight: 700;
              padding: 0.8mm 3mm;
              border-radius: 3mm;
              margin-top: 1.2mm;
              z-index: 10;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .front-footer {
              position: absolute;
              bottom: 3.5mm;
              left: 3.5mm;
              right: 3.5mm;
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              z-index: 10;
            }
            .qr-wrapper {
              background-color: #ffffff;
              padding: 0.8mm;
              border-radius: 1mm;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .qr-wrapper svg {
              width: 14mm !important;
              height: 14mm !important;
              display: block;
            }
            .footer-meta {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              margin-bottom: 0.5mm;
            }
            .meta-item {
              font-size: 5pt;
              margin-bottom: 0.3mm;
            }
            .meta-label {
              color: #64748b;
              font-weight: 600;
              margin-right: 1mm;
            }
            .meta-val {
              color: #0f172a;
              font-weight: 700;
              font-family: monospace;
            }
            
            /* Terms and list on back side */
            .terms-title {
              background-color: #0b132b;
              color: #ffffff;
              font-size: 5.5pt;
              font-weight: 800;
              padding: 1mm 3.5mm;
              border-radius: 3mm;
              margin-top: 4.5mm;
              z-index: 10;
              text-align: center;
              letter-spacing: 0.8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .terms-list {
              width: 88%;
              margin-top: 3.5mm;
              display: flex;
              flex-direction: column;
              gap: 1.8mm;
              z-index: 10;
            }
            .term-item {
              display: flex;
              align-items: flex-start;
              gap: 2mm;
            }
            .term-num {
              width: 3.5mm;
              height: 3.5mm;
              border-radius: 50%;
              background-color: #00b4d8;
              color: #ffffff;
              font-size: 4.5pt;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              margin-top: 0.3mm;
            }
            .term-text {
              font-size: 4.8pt;
              line-height: 1.3;
              color: #334155;
              font-weight: 600;
            }
            .contact-info {
              position: absolute;
              bottom: 3.5mm;
              left: 3.5mm;
              right: 3.5mm;
              z-index: 10;
              display: flex;
              flex-direction: column;
              gap: 0.8mm;
              border-top: 0.5px solid #cbd5e1;
              padding-top: 1.5mm;
            }
            .contact-row {
              display: flex;
              align-items: center;
              gap: 1.5mm;
              font-size: 4.8pt;
              color: #475569;
              font-weight: 600;
            }
            .contact-icon {
              color: #00b4d8;
              font-size: 5.5pt;
              width: 3mm;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">🖨️ Print ID Card Pass</button>
          
          <div class="cards-wrapper">
            <!-- FRONT SIDE -->
            <div class="id-card-front">
              <div class="bg-shape-top"></div>
              <div class="bg-shape-accent1"></div>
              <div class="bg-shape-accent2"></div>
              <div class="bg-shape-accent3"></div>
              
              <div class="logo-area">
                <div class="logo-icon"></div>
                <div class="logo-text">ARSHI</div>
              </div>
              
              <div class="photo-container">
                <div class="avatar-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              </div>
              
              <div class="name-pill">${selectedStaff.firstName} ${selectedStaff.lastName}</div>
              <div class="role-pill">${designationName}</div>
              
              <div class="front-footer">
                <div class="qr-wrapper">
                  ${printContent.innerHTML}
                </div>
                <div class="footer-meta">
                  <div class="meta-item"><span class="meta-label">Joined:</span><span class="meta-val">${joinedDate}</span></div>
                  <div class="meta-item"><span class="meta-label">RFID UID:</span><span class="meta-val">${selectedStaff.rfidCard || 'NOT SET'}</span></div>
                  <div class="meta-item"><span class="meta-label">Emp ID:</span><span class="meta-val">${selectedStaff.employeeId}</span></div>
                </div>
              </div>
            </div>
            
            <!-- BACK SIDE -->
            <div class="id-card-back">
              <div class="bg-shape-top-back"></div>
              <div class="bg-shape-accent1" style="top: 15%; height: 8%;"></div>
              <div class="bg-shape-accent2" style="bottom: 0; left: 0; right: auto; width: 60%; height: 25%; clip-path: polygon(0 100%, 0 0, 100% 100%);"></div>
              
              <div class="logo-area" style="margin-top: 3.5mm;">
                <div class="logo-icon"></div>
                <div class="logo-text">ARSHI</div>
              </div>
              
              <div class="terms-title">TERMS & CONDITIONS</div>
              
              <div class="terms-list">
                <div class="term-item">
                  <div class="term-num">01</div>
                  <div class="term-text">This card is property of Arshi Enterprise & is non-transferable.</div>
                </div>
                <div class="term-item">
                  <div class="term-num">02</div>
                  <div class="term-text">Always display this identity pass while inside warehouse premises.</div>
                </div>
                <div class="term-item">
                  <div class="term-num">03</div>
                  <div class="term-text">Scan at entry and exit gates to register warehouse duty sessions.</div>
                </div>
                <div class="term-item">
                  <div class="term-num">04</div>
                  <div class="term-text">If found, please return to the nearest branch or organization HQ.</div>
                </div>
              </div>
              
              <div class="contact-info">
                <div class="contact-row">
                  <span class="contact-icon">📍</span>
                  <span>Patna, Bihar, India</span>
                </div>
                <div class="contact-row">
                  <span class="contact-icon">✉️</span>
                  <span>support@arshienterprise.com</span>
                </div>
                <div class="contact-row">
                  <span class="contact-icon">📞</span>
                  <span>+91 9709846929</span>
                </div>
                <div class="contact-row">
                  <span class="contact-icon">🌐</span>
                  <span>www.arshienterprise.com</span>
                </div>
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDirectPrint = (staff: Staff) => {
    setSelectedStaff(staff);
    setQrCodeData(staff.qrCode || null);
    setTimeout(() => {
      handlePrintQR();
    }, 100);
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
      header: 'Identity Pass (QR & Card)',
      accessorKey: 'qrCode',
      render: (item) => (
        item.qrCode ? (
          <div className="flex items-center space-x-1.5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleOpenQRView(item, item.qrCode!)} 
              className="h-7 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-900/20 px-2 py-0.5 flex items-center space-x-1"
              title="View Digital ID Pass"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>View</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDirectPrint(item)} 
              className="h-7 text-xs border-indigo-500/30 text-indigo-400 bg-indigo-950/10 hover:bg-indigo-900/20 px-2 py-0.5 flex items-center space-x-1"
              title="Print Physical Card Sticker"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </Button>
          </div>
        ) : (
          user?.role === 'super_admin' ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleGenerateQR(item._id)} 
              className="h-7 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/20 px-2 py-0.5"
            >
              + Generate Pass
            </Button>
          ) : <span className="text-xs text-slate-500">Unassigned</span>
        )
      )
    },
    {
      header: 'RFID Smart Card',
      accessorKey: 'rfidCard',
      render: (item) => (
        item.rfidCard ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenQuickRfid(item)}
            className="h-7 text-xs border-indigo-500/40 text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 flex items-center space-x-1"
          >
            <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-mono text-[11px]">{item.rfidCard}</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenQuickRfid(item)}
            className="h-7 text-[11px] border-amber-500/30 text-amber-400 bg-amber-950/20 hover:bg-amber-900/40 flex items-center space-x-1"
          >
            <CreditCard className="h-3.5 w-3.5 text-amber-400" />
            <span>+ Assign RFID</span>
          </Button>
        )
      )
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      render: (item) => (
        (user?.role === 'super_admin' || user?.role === 'branch_admin') ? (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleEditStaff(item)} className="h-8 w-8 p-0 text-indigo-400 hover:text-indigo-300" title="Edit Full Staff Profile">
              <Edit className="h-4 w-4" />
            </Button>
            {user?.role === 'super_admin' && (
              <Button variant="outline" size="sm" onClick={() => handleDelete(item._id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300" title="Delete Staff">
                <Trash className="h-4 w-4" />
              </Button>
            )}
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
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919709846929" />
            </div>
          </div>

          {/* Courier Verification Profile Fields matching screenshot */}
          <div className="border border-indigo-500/20 bg-slate-950/60 rounded-xl p-3.5 space-y-3">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span>👤</span>
              <span>Courier Verification Profile Details</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-amber-400">Father's Name (S/O)</label>
                <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} placeholder="e.g. Binod Verma" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Alternate Mobile Number</label>
                <Input value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} placeholder="e.g. 9812310004" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-emerald-400">Aadhar Card Number</label>
                <Input value={aadharNumber} onChange={(e) => setAadharNumber(e.target.value)} placeholder="e.g. 4536 7890 1238" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">PAN Card Number</label>
                <Input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="e.g. ABCDE1004F" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Designation / Role Title</label>
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Delivery Staff / Courier" />
            </div>

            {/* Complete Address Details */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complete Address Details</label>
              <div className="grid grid-cols-2 gap-2">
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street / Main Road / Station Chowk" className="col-span-2 text-xs" />
                <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District (e.g. Bhagalpur)" className="text-xs" />
                <Input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State (e.g. Bihar)" className="text-xs" />
                <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode (e.g. 854301)" className="col-span-2 text-xs" />
              </div>
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
                <option value="staff">Delivery Staff / Courier</option>
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

      {/* Quick RFID Card Assignment Dialog */}
      <Dialog
        isOpen={quickRfidModalOpen}
        onClose={() => setQuickRfidModalOpen(false)}
        title="🪪 Assign RFID Smart Card"
      >
        {selectedStaff && (
          <form onSubmit={handleSaveQuickRfid} className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/30">
                {selectedStaff.firstName[0]}
                {selectedStaff.lastName[0]}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">{selectedStaff.firstName} {selectedStaff.lastName}</h4>
                <p className="text-xs text-slate-400 font-mono">Emp ID: {selectedStaff.employeeId} • {selectedStaff.role.replace('_', ' ').toUpperCase()}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>RFID Card UID / Tag Number</span>
                <span className="text-[10px] text-indigo-400 font-mono">Tap Card or Type ID</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  autoFocus
                  placeholder="Tap card on RFID reader or enter UID (e.g. 0007373474)"
                  value={quickRfidValue}
                  onChange={(e) => setQuickRfidValue(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-indigo-500 text-sm font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Simply place the RFID Smart Card on your connected reader to auto-fill the card ID.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setQuickRfidModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1">
                <Sparkles className="h-4 w-4" />
                <span>Save RFID Card</span>
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Hidden print element helper */}
      <div id="staff-qr-print-element-hidden" className="hidden" style={{ display: 'none' }}>
        {qrCodeData && (
          <QRCodeSVG
            value={qrCodeData}
            size={220}
            level="M"
          />
        )}
      </div>
    </div>
  );
};
export default StaffListPage;
