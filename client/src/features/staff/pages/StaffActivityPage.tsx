import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Search, RefreshCw, ShieldCheck, ShieldAlert, Clock, ArrowRightLeft, CreditCard } from 'lucide-react';
import { io } from 'socket.io-client';

interface SecurityScan {
  _id: string;
  type: string;
  gateNumber: number;
  result: 'approved' | 'rejected';
  rfidCardScanned?: string;
  rfidVerified?: boolean;
  overrideUsed?: boolean;
  notes?: string;
  timestamp: string;
  branchId?: {
    _id: string;
    name: string;
    code: string;
    city?: string;
  };
  transferId?: {
    _id: string;
    transferId: string;
    fromBranchId?: { name: string; code: string };
    toBranchId?: { name: string; code: string };
  };
  staffQR: {
    scanned: boolean;
    valid: boolean;
    staffId?: {
      firstName: string;
      lastName: string;
      employeeId: string;
      designation?: string;
    };
  };
  securityGuardId?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

export const StaffActivityPage: React.FC = () => {
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedResult, setSelectedResult] = useState('all');

  const fetchScans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/security/scans', {
        params: {
          page,
          limit: 15,
          type: selectedType !== 'all' ? selectedType : undefined,
          result: selectedResult !== 'all' ? selectedResult : undefined,
        }
      });
      
      let fetchedScans = response.data.data || [];
      
      // Local client-side search filtering (fallback helper for instant filtering)
      if (search.trim()) {
        const query = search.toLowerCase();
        fetchedScans = fetchedScans.filter((scan: SecurityScan) => {
          const staffName = `${scan.staffQR?.staffId?.firstName || ''} ${scan.staffQR?.staffId?.lastName || ''}`.toLowerCase();
          const empId = (scan.staffQR?.staffId?.employeeId || '').toLowerCase();
          const rfid = (scan.rfidCardScanned || '').toLowerCase();
          const guardName = `${scan.securityGuardId?.firstName || ''} ${scan.securityGuardId?.lastName || ''}`.toLowerCase();
          
          return staffName.includes(query) || empId.includes(query) || rfid.includes(query) || guardName.includes(query);
        });
      }

      setScans(fetchedScans);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (err: any) {
      toast.error('Failed to load staff gate activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, [page, selectedType, selectedResult]);

  // Handle manual search with debounce or button click
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchScans();
    }
  };

  useEffect(() => {
    // Establish WebSocket Connection for Real-Time RFID activity stream
    const socketUrl = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5000').replace('/api/v1', '');
    const socket = io(socketUrl, {
      withCredentials: true
    });

    socket.on('security_scan_logged', (newScan: any) => {
      // Prepend to scans array and set visual highlight
      setScans(prevScans => {
        const exists = prevScans.some(s => s._id === newScan._id);
        if (exists) return prevScans;

        // Sound alert
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.connect(gain);
          gain.connect(context.destination);
          osc.frequency.value = 880; // Beep
          gain.gain.setValueAtTime(0.15, context.currentTime);
          osc.start();
          osc.stop(context.currentTime + 0.15);
        } catch (e) {
          console.log('Audio Context beep failed / blocked by gesture');
        }

        toast.success(`Live Scan Alert: ${newScan.staffQR?.staffId?.firstName || 'Staff'} passed gate ${newScan.gateNumber}`);
        return [newScan, ...prevScans.slice(0, 14)];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const columns: Column<SecurityScan>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      render: (item) => (
        <div className="flex items-center space-x-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <div>
            <p className="font-bold text-slate-200 text-xs">
              {new Date(item.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
            <p className="text-[10px] font-mono text-slate-400">
              {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Staff Custodian',
      accessorKey: 'staffQR.staffId',
      render: (item) => {
        const staff = item.staffQR?.staffId;
        if (!staff) return <span className="text-slate-500 font-mono">Anonymous Scan</span>;
        return (
          <div>
            <p className="font-bold text-slate-200 text-xs">{staff.firstName} {staff.lastName}</p>
            <p className="text-[10px] text-slate-400 font-medium">{staff.designation || 'Logistics Courier'}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Emp ID: {staff.employeeId}</p>
          </div>
        );
      }
    },
    {
      header: 'Gate / Activity',
      accessorKey: 'type',
      render: (item) => {
        const isEntry = item.type === 'entry' || item.type === 'gate_entry';
        return (
          <div className="space-y-1">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isEntry 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}>
              {isEntry ? '📥 Warehouse Entry (Ghusna)' : '📤 Warehouse Exit (Nikalna)'}
            </span>
            <p className="text-[10px] text-slate-300 font-semibold">
              Warehouse: <span className="text-indigo-400">{item.branchId?.name || 'Central Head Office'}</span>
            </p>
            <p className="text-[9px] text-slate-500 font-medium">Gate Number: {item.gateNumber}</p>
          </div>
        );
      }
    },
    {
      header: 'RFID Card Scanned',
      accessorKey: 'rfidCardScanned',
      render: (item) => (
        item.rfidCardScanned ? (
          <div className="flex items-center space-x-1.5 font-mono text-xs text-indigo-300 bg-indigo-950/20 px-2 py-1 rounded-md border border-indigo-800/30 w-fit">
            <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
            <span>{item.rfidCardScanned}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-mono">QR Scan / Not Scanned</span>
        )
      )
    },
    {
      header: 'Security Clearance Status',
      accessorKey: 'result',
      render: (item) => {
        if (item.overrideUsed) {
          return (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] uppercase font-bold flex items-center space-x-1 w-fit">
              <ShieldAlert className="h-3 w-3" />
              <span>Guard Bypass (Override)</span>
            </Badge>
          );
        }
        if (item.rfidVerified) {
          return (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-bold flex items-center space-x-1 w-fit">
              <ShieldCheck className="h-3 w-3" />
              <span>RFID Verified</span>
            </Badge>
          );
        }
        return (
          <Badge variant={item.result === 'approved' ? 'success' : 'destructive'} className="text-[10px] uppercase font-bold w-fit">
            {item.result}
          </Badge>
        );
      }
    },
    {
      header: 'Security Officer',
      accessorKey: 'securityGuardId',
      render: (item) => (
        item.securityGuardId ? (
          <div>
            <p className="font-bold text-slate-300 text-xs">{item.securityGuardId.firstName} {item.securityGuardId.lastName}</p>
            <p className="text-[9px] text-slate-500 font-mono">Guard ID: {item.securityGuardId.employeeId}</p>
          </div>
        ) : (
          <span className="text-slate-500 text-xs">Direct/Admin Scan</span>
        )
      )
    },
    {
      header: 'Linked Route',
      accessorKey: 'transferId',
      render: (item) => (
        item.transferId ? (
          <div className="text-slate-300 text-xs">
            <div className="flex items-center space-x-1 font-bold text-indigo-400">
              <ArrowRightLeft className="h-3 w-3" />
              <span>{item.transferId.transferId}</span>
            </div>
            <p className="text-[9px] text-slate-500 truncate mt-0.5 max-w-[130px]">
              {item.transferId.fromBranchId?.name} → {item.transferId.toBranchId?.name}
            </p>
          </div>
        ) : (
          <span className="text-slate-500 text-xs font-mono">-</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader 
        title="Warehouse Staff Activity Logs" 
        subtitle="Real-time live audit of courier entry/exit security clearances and RFID card swipes"
      />

      {/* Real-time Indicator Alert bar */}
      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-indigo-300 shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span className="font-semibold uppercase tracking-wider text-[10px]">Real-Time Streaming Active</span>
        </div>
        <span>Staff swipe records are instantly prepended with beep notifications.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-card border border-border">
        {/* Search */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-slate-400">Search Custodian/Guard</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              placeholder="Search by name, ID or RFID card..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Gate Activity type Filter */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-slate-400">Activity Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All Activities (Entry & Exit)</option>
            <option value="entry">📥 Warehouse Entries Only</option>
            <option value="exit">📤 Warehouse Exits Only</option>
          </select>
        </div>

        {/* Verification Result Filter */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold text-slate-400">Verification Result</label>
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All Scans</option>
            <option value="approved">Approved Clearances</option>
            <option value="rejected">Rejected Attempts</option>
          </select>
        </div>

        {/* Reset Actions */}
        <div className="flex items-end space-x-2">
          <Button onClick={fetchScans} className="flex-1 flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-white">
            <RefreshCw className="h-4 w-4" />
            <span>Search</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSearch('');
              setSelectedType('all');
              setSelectedResult('all');
              setPage(1);
            }}
            className="flex-1"
          >
            Reset
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={scans}
        isLoading={loading}
        searchValue=""
        onSearchChange={() => {}}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};

export default StaffActivityPage;
