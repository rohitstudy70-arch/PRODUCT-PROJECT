import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';

interface AuditLog {
  _id: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  description: string;
  ipAddress: string;
  timestamp: string;
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit-logs', {
        params: { page, limit: 15 }
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
    fetchLogs();
  }, [page]);

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      render: (item) => new Date(item.timestamp).toLocaleString('en-IN')
    },
    { header: 'Action User', accessorKey: 'userName' },
    {
      header: 'Role',
      accessorKey: 'userRole',
      render: (item) => <span className="uppercase text-[10px] font-bold text-indigo-400">{item.userRole.replace('_', ' ')}</span>
    },
    { header: 'Action Type', accessorKey: 'action' },
    { header: 'Module', accessorKey: 'module' },
    { header: 'Audit Detail Description', accessorKey: 'description' },
    { header: 'IP Address', accessorKey: 'ipAddress' }
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />
      <PageHeader title="Immutable System Audit Trail" subtitle="Historical logs of all data creations, modifications, and logistical clearances" />

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
