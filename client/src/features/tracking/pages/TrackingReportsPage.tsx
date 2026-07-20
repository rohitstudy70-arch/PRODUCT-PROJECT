import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Download, Printer, Route } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { RouteHistoryModal } from '../components/RouteHistoryModal';

interface DutySessionReport {
  _id: string;
  staffId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
    phone: string;
  };
  branchId: {
    _id: string;
    name: string;
    code: string;
  };
  startTime: string;
  endTime?: string;
  status: 'ON_DUTY' | 'OFF_DUTY' | 'PAUSED';
  totalDistanceKm: number;
  exitGateNumber?: string;
  entryGateNumber?: string;
}

export const TrackingReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DutySessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyModalSessionId, setHistoryModalSessionId] = useState<string | null>(null);

  const { user } = useAuthStore();

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches', { params: { limit: 100 } });
      setBranches(res.data.data);
    } catch {
      // optional
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tracking/reports', {
        params: {
          page,
          limit: 10,
          branchId: selectedBranchId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      setReports(response.data.data);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (err: any) {
      toast.error('Failed to load tracking reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [page, selectedBranchId, startDate, endDate]);

  const handleExportCSV = () => {
    if (reports.length === 0) {
      toast.error('No report data available to export');
      return;
    }

    const headers = ['Duty Session ID', 'Staff Name', 'Employee ID', 'Branch', 'Duty Status', 'Start Time (Exit)', 'End Time (Entry)', 'Distance (KM)'];
    const rows = reports.map(r => [
      r._id,
      r.staffId ? `${r.staffId.firstName} ${r.staffId.lastName}` : 'N/A',
      r.staffId?.employeeId || 'N/A',
      r.branchId?.name || 'N/A',
      r.status,
      r.startTime ? new Date(r.startTime).toLocaleString('en-IN') : 'N/A',
      r.endTime ? new Date(r.endTime).toLocaleString('en-IN') : 'N/A',
      r.totalDistanceKm ? r.totalDistanceKm.toFixed(2) : '0'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Duty_Tracking_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV Report exported successfully');
  };

  const columns: Column<DutySessionReport>[] = [
    {
      header: 'Staff Member',
      accessorKey: 'staffId.firstName',
      render: (item) => (
        <div>
          <p className="font-bold text-slate-200">
            {item.staffId ? `${item.staffId.firstName} ${item.staffId.lastName}` : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.staffId?.employeeId || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Branch',
      accessorKey: 'branchId.name',
      render: (item) => item.branchId?.name || 'Central Head Office'
    },
    {
      header: 'Duty Start (Gate Exit)',
      accessorKey: 'startTime',
      render: (item) => (
        <span className="font-mono text-slate-300">
          {item.startTime ? new Date(item.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
        </span>
      )
    },
    {
      header: 'Duty End (Gate Entry)',
      accessorKey: 'endTime',
      render: (item) => (
        <span className="font-mono text-slate-300">
          {item.endTime ? new Date(item.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Active On Duty'}
        </span>
      )
    },
    {
      header: 'Total Distance',
      accessorKey: 'totalDistanceKm',
      render: (item) => (
        <span className="font-bold text-emerald-400 font-mono">
          {item.totalDistanceKm ? `${item.totalDistanceKm.toFixed(2)} km` : '0.00 km'}
        </span>
      )
    },
    {
      header: 'Duty Status',
      accessorKey: 'status',
      render: (item) => (
        <Badge variant={item.status === 'ON_DUTY' ? 'success' : 'secondary'}>
          {item.status}
        </Badge>
      )
    },
    {
      header: 'Route History',
      accessorKey: 'actions',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHistoryModalSessionId(item._id)}
          className="h-8 text-[11px] space-x-1"
        >
          <Route className="h-3.5 w-3.5" />
          <span>Playback Path</span>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader
        title="Duty & Location Tracking Reports"
        subtitle="Historical logs of courier duty sessions, travel distances, and entry/exit timestamps"
      >
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center space-x-1">
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </Button>
          <Button size="sm" onClick={handleExportCSV} className="flex items-center space-x-1">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </PageHeader>

      {/* Control Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-xl">
        {user?.role === 'super_admin' && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Filter Branch</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-950 border-slate-800"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-950 border-slate-800"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={reports}
        isLoading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Route History Playback Modal */}
      {historyModalSessionId && (
        <RouteHistoryModal
          dutySessionId={historyModalSessionId}
          isOpen={!!historyModalSessionId}
          onClose={() => setHistoryModalSessionId(null)}
        />
      )}
    </div>
  );
};

export default TrackingReportsPage;
