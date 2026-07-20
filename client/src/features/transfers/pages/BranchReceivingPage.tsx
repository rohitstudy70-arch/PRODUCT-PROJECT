import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { QRScanner } from '../../../components/shared/QRScanner';
import { Badge } from '../../../components/ui/badge';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Building2, ShieldCheck } from 'lucide-react';

interface Branch {
  _id: string;
  name: string;
  code: string;
}

export const BranchReceivingPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
  const [receivedHistory, setReceivedHistory] = useState<any[]>([]);

  const fetchBranchesAndTransfers = async () => {
    try {
      const brRes = await api.get('/branches', { params: { limit: 100 } });
      setBranches(brRes.data.data);
      if (brRes.data.data.length > 0 && !selectedBranchId) {
        setSelectedBranchId(brRes.data.data[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load branches');
    }
  };

  const fetchTransfersForBranch = async () => {
    if (!selectedBranchId) return;
    try {
      const response = await api.get('/transfers', { params: { limit: 100 } });
      const allTransfers = response.data.data;
      
      // Filter incoming in-transit
      const incoming = allTransfers.filter(
        (t: any) => t.toBranchId?._id === selectedBranchId && t.status === 'in_transit'
      );
      setIncomingTransfers(incoming);

      // Filter received history
      const history = allTransfers.filter(
        (t: any) => t.toBranchId?._id === selectedBranchId && t.status === 'received'
      );
      setReceivedHistory(history);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBranchesAndTransfers();
  }, []);

  useEffect(() => {
    fetchTransfersForBranch();
  }, [selectedBranchId]);

  const handleConfirmArrival = async (scannedCode: string) => {
    if (!selectedBranchId) {
      toast.error('Please select a branch first');
      return;
    }

    try {
      const response = await api.post('/transfers/confirm-arrival', {
        staffQrCode: scannedCode.trim(),
        toBranchId: selectedBranchId
      });
      
      toast.success(response.data.message);
      fetchTransfersForBranch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm arrival');
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader
        title="Branch Asset Receiving"
        subtitle="Confirm arrival of incoming transfers and log cargo payload into branch stock"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Branch Selector & Scanner */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-indigo-400" />
                <span>Select Operating Branch Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-400">Current Receiving Branch</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select branch...</option>
                  {branches.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Scanner Box */}
          <Card className="glass-card">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <span>Confirm Courier Staff Arrival</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <QRScanner
                onScanSuccess={handleConfirmArrival}
                placeholder="Scan Staff QR card or enter Employee ID"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Incoming and History */}
        <div className="space-y-6">
          {/* Incoming Items */}
          <Card className="glass-card">
            <CardHeader className="pb-3 border-b border-slate-800/60">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Incoming (In Transit)</span>
                <Badge variant="warning">{incomingTransfers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {incomingTransfers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2 text-center">No transfers currently in-transit to this branch.</p>
                ) : (
                  incomingTransfers.map((t) => (
                    <div key={t._id} className="p-3 bg-slate-950/40 border border-slate-800/50 rounded-lg space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">{t.transferId}</span>
                        <Badge variant="warning" className="text-[9px]">In Transit</Badge>
                      </div>
                      <div className="text-slate-400">
                        <p><span className="font-semibold">Carrier:</span> {t.assignedStaffId ? `${t.assignedStaffId.firstName} ${t.assignedStaffId.lastName}` : 'N/A'}</p>
                        <p><span className="font-semibold">Origin:</span> {t.fromBranchId?.name}</p>
                        <p><span className="font-semibold">Items:</span> {t.totalItems} devices</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Receiving History */}
          <Card className="glass-card">
            <CardHeader className="pb-3 border-b border-slate-800/60">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Branch Receiving History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                {receivedHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2 text-center">No receiving records found.</p>
                ) : (
                  receivedHistory.map((t) => (
                    <div key={t._id} className="p-2.5 bg-slate-950/20 border border-slate-850 rounded border-l-2 border-l-emerald-500 flex items-center justify-between text-[11px]">
                      <div>
                        <p className="font-bold text-slate-300">{t.transferId}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          From: <span className="text-slate-300 font-semibold">{t.fromBranchId?.name || 'Central Head Office'}</span>
                        </p>
                        <p className="text-slate-500 mt-0.5 font-mono text-[10px]">
                          {(t.arrivedAt || t.receivedAt || t.updatedAt) 
                            ? new Date(t.arrivedAt || t.receivedAt || t.updatedAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              }) 
                            : 'N/A'}
                        </p>
                      </div>
                      <Badge variant="success" className="text-[8px]">Received</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default BranchReceivingPage;
