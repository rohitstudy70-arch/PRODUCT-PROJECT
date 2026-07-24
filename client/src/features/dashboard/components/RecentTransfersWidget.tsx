import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ArrowRightLeft, ArrowRight, Truck, Eye, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../config/routes';

interface RecentTransfersWidgetProps {
  transfers: any[];
  onSelectTransfer?: (transfer: any) => void;
}

export const RecentTransfersWidget: React.FC<RecentTransfersWidgetProps> = ({ transfers, onSelectTransfer }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'info';
      case 'preparing': return 'warning';
      case 'ready_for_dispatch': return 'info';
      case 'in_transit': return 'warning';
      case 'received': return 'success';
      default: return 'secondary';
    }
  };

  const exportExcel = () => {
    if (transfers.length === 0) return;
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Transfer ID,From Branch,To Branch,Courier,Items,Status,Date\n' +
      transfers.map(t => `${t.transferId},${t.fromBranchId?.name || ''},${t.toBranchId?.name || ''},${t.assignedStaffId ? `${t.assignedStaffId.firstName} ${t.assignedStaffId.lastName}` : 'N/A'},${t.totalItems || 1},${t.status},${new Date(t.createdAt).toLocaleDateString('en-IN')}`).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recent_transfers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-xl">
      <CardHeader className="p-4 md:p-6 border-b border-slate-800/80 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-100">Recent Logistics Transfers</CardTitle>
            <p className="text-xs text-slate-400">Live movement log across enterprise branch network</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            className="h-8 text-xs border-slate-800 hover:border-slate-700 text-slate-300 flex items-center space-x-1 cursor-pointer"
            title="Export CSV / Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Link to={ROUTES.TRANSFERS}>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <div className="space-y-3">
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic space-y-1">
              <Truck className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">No Recent Transfer Operations</p>
              <p className="text-xs">Use the top IMEI search bar to select a product and assign transfers.</p>
            </div>
          ) : (
            transfers.slice(0, 6).map((t) => (
              <div
                key={t._id}
                onClick={() => onSelectTransfer && onSelectTransfer(t)}
                className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-indigo-400 group-hover:text-indigo-300">
                        {t.transferId}
                      </span>
                      <Badge variant={getStatusVariant(t.status)} className="text-[9px] uppercase px-2 py-0">
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-300 mt-1">
                      <span className="font-semibold">{t.fromBranchId?.name || 'Central Stock'}</span>
                      <ArrowRight className="h-3 w-3 text-slate-500" />
                      <span className="font-semibold text-indigo-300">{t.toBranchId?.name || 'Branch'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 text-xs">
                  <div className="text-left md:text-right text-[11px] text-slate-400">
                    <p>
                      Courier: <span className="text-slate-200 font-semibold">{t.assignedStaffId ? `${t.assignedStaffId.firstName} ${t.assignedStaffId.lastName}` : 'Unassigned'}</span>
                    </p>
                    <p className="font-mono text-slate-500 text-[10px] mt-0.5">
                      {new Date(t.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>

                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 group-hover:text-indigo-400">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
