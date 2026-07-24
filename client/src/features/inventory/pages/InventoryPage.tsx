import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { Badge } from '../../../components/ui/badge';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';

interface InventoryItem {
  _id: string;
  productId: {
    _id: string;
    productId: string;
    name: string;
    serialNumber: string;
    imei: string;
    category: {
      name: string;
    };
  };
  branchId: {
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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory', {
        params: { page, limit: 100, search }
      });
      setItems(response.data.data);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (err: any) {
      toast.error('Failed to load inventory logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, search]);

  const columns: Column<InventoryItem>[] = [
    {
      header: 'Product ID',
      accessorKey: 'productId.productId',
      render: (item) => item.productId?.productId
    },
    {
      header: 'Asset Name',
      accessorKey: 'productId.name',
      render: (item) => item.productId?.name
    },
    {
      header: 'Category',
      accessorKey: 'productId.category.name',
      render: (item) => item.productId?.category?.name
    },
    {
      header: 'Serial No',
      accessorKey: 'productId.serialNumber',
      render: (item) => item.productId?.serialNumber || 'N/A'
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
        <Badge variant={item.status === 'available' ? 'success' : item.status === 'in_transit' ? 'info' : 'warning'}>
          {item.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />
      <PageHeader title="Real-time Inventory Ledger" subtitle="Live tracking logs of physical hardware locations and custody assignments" />

      <DataTable
        columns={columns}
        data={items}
        isLoading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchPlaceholder="Search by product name, ID or serial number..."
      />
    </div>
  );
};
export default InventoryPage;
