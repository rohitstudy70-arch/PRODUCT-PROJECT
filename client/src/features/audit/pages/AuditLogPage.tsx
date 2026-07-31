import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Search, RefreshCw, Filter, Building2, ScrollText } from 'lucide-react';

interface AuditLog {
  _id: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  description: string;
  ipAddress: string;
  branchId?: { _id: string; name: string; code: string };
  timestamp: string;
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState('all');

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches', { params: { limit: 100 } });
      setBranches(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load branches for audit filter', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit-logs', {
        params: {
          page,
          limit: 15,
          search: search || undefined,
          module: selectedModule !== 'all' ? selectedModule : undefined,
          branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined
        }
      });
      setLogs(response.data.data);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (err: any) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, search, selectedModule, selectedBranchId]);

  const getModuleBadgeVariant = (mod: string) => {
    switch (mod.toLowerCase()) {
      case 'security': return 'warning';
      case 'logistics': case 'transfer': return 'info';
      case 'product': return 'success';
      case 'staff': return 'secondary';
      default: return 'outline';
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      render: (item) => (
        <div>
          <p className="font-bold text-slate-200 text-xs">
            {new Date(item.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
          <p className="text-[10px] font-mono text-slate-400">
            {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </p>
        </div>
      )
    },
    {
      header: 'Action User',
      accessorKey: 'userName',
      render: (item) => (
        <div>
          <p className="font-bold text-slate-100">{item.userName}</p>
          <Badge variant="secondary" className="uppercase text-[9px] font-bold mt-0.5">
            {item.userRole ? item.userRole.replace('_', ' ') : 'SYSTEM'}
          </Badge>
        </div>
      )
    },
    {
      header: 'Location / Branch',
      accessorKey: 'branchId.name',
      render: (item) => (
        <span className="text-xs font-semibold text-indigo-300">
          {item.branchId?.name || 'Central Head Office'}
        </span>
      )
    },
    {
      header: 'Module',
      accessorKey: 'module',
      render: (item) => (
        <Badge variant={getModuleBadgeVariant(item.module)} className="uppercase text-[9px] font-bold">
          {item.module}
        </Badge>
      )
    },
    {
      header: 'Action',
      accessorKey: 'action',
      render: (item) => (
        <span className="font-mono text-xs uppercase text-amber-400 font-bold">
          {item.action.replace('_', ' ')}
        </span>
      )
    },
    {
      header: 'Audit Detail Description',
      accessorKey: 'description',
      render: (item) => (
        <p className="text-xs text-slate-200 max-w-md leading-relaxed font-sans">
          {item.description}
        </p>
      )
    },
    {
      header: 'IP Address',
      accessorKey: 'ipAddress',
      render: (item) => (
        <span className="font-mono text-[10px] text-slate-400">
          {item.ipAddress || '10.24.5.130'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader
        title="Immutable System Audit Trail"
        subtitle="Historical logs of all product assignments, security gate clearances, staff actions, and branch movements"
      >
        <Button variant="outline" size="sm" onClick={fetchLogs} className="flex items-center space-x-1">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Logs</span>
        </Button>
      </PageHeader>

      {/* Audit Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search user, courier, product IMEI, transfer ID..."
              className="w-full sm:w-80 pl-9 bg-slate-950 border-slate-800 text-xs"
            />
          </div>

          {/* Module Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="flex h-10 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 cursor-pointer"
            >
              <option value="all">All Modules</option>
              <option value="transfer">Logistics & Transfers</option>
              <option value="security">Security Gate Clearance</option>
              <option value="product">Product Catalog</option>
              <option value="staff">Staff Management</option>
              <option value="inventory">Inventory Control</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setPage(1);
              }}
              className="flex h-10 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-mono border-slate-700 text-slate-300 self-start md:self-center">
          <ScrollText className="h-3.5 w-3.5 mr-1 text-indigo-400" />
          <span>Showing Page {page} of {totalPages}</span>
        </Badge>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};

export default AuditLogPage;
