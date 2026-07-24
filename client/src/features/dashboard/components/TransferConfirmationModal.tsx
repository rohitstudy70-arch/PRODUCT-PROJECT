import React from 'react';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ArrowRight, AlertCircle, ShieldCheck, Truck, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface TransferConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  product: any;
  destinationBranch: any;
  courier: any;
  transferId: string;
  reason: string;
  expectedDeliveryDate: string;
  remarks: string;
  adminName: string;
}

export const TransferConfirmationModal: React.FC<TransferConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  product,
  destinationBranch,
  courier,
  transferId,
  reason,
  expectedDeliveryDate,
  remarks,
  adminName
}) => {
  if (!product || !destinationBranch || !courier) return null;

  const sourceBranchName = product.currentBranchId
    ? (typeof product.currentBranchId === 'object' ? product.currentBranchId.name : 'Branch')
    : 'Central Main Stock';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Confirm Enterprise Product Transfer">
      <div className="space-y-5 p-2 text-slate-200">
        {/* Warning Alert Banner */}
        <div className="flex items-start space-x-3 p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Are you sure you want to transfer this product asset?</p>
            <p className="text-[11px] text-amber-400/80">
              Upon confirmation, the product status will immediately update to <span className="font-bold text-amber-300">IN TRANSIT</span> and custody will shift to courier <span className="font-bold text-amber-300">{courier.firstName} {courier.lastName}</span>.
            </p>
          </div>
        </div>

        {/* Transfer ID & Status Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Transfer ID</p>
            <p className="text-sm font-mono font-bold text-indigo-400 mt-0.5">{transferId}</p>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-950/40 text-xs px-2.5 py-1">
            Ready for Authorization
          </Badge>
        </div>

        {/* Visual Source -> Destination Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Source Branch</p>
            <p className="font-bold text-slate-100">{sourceBranchName}</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Destination Branch</p>
            <p className="font-bold text-indigo-300">{destinationBranch.name}</p>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
              <FileText className="h-3 w-3 mr-1 text-slate-400" />
              Product Manifest
            </p>
            <p className="font-bold text-slate-200">{product.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">IMEI: {product.imei || 'N/A'}</p>
            <p className="text-[10px] text-slate-400 font-mono">ID: {product.productId}</p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
              <Truck className="h-3 w-3 mr-1 text-slate-400" />
              Assigned Courier
            </p>
            <p className="font-bold text-slate-200">{`${courier.firstName} ${courier.lastName}`}</p>
            <p className="text-[10px] text-slate-400 font-mono">Emp ID: {courier.employeeId}</p>
            <p className="text-[10px] text-slate-400 font-mono">Phone: {courier.phone || 'N/A'}</p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
              <Calendar className="h-3 w-3 mr-1 text-slate-400" />
              Expected Delivery
            </p>
            <p className="font-semibold text-slate-200">
              {expectedDeliveryDate ? new Date(expectedDeliveryDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Not Specified'}
            </p>
            <p className="text-[10px] text-slate-400">Reason: {reason}</p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
              <ShieldCheck className="h-3 w-3 mr-1 text-slate-400" />
              Assigned By Admin
            </p>
            <p className="font-semibold text-slate-200">{adminName}</p>
            <p className="text-[10px] text-slate-400">Timestamp: {new Date().toLocaleTimeString('en-IN', { timeStyle: 'short' })}</p>
          </div>
        </div>

        {remarks && (
          <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 text-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Remarks / Instructions:</p>
            <p className="text-slate-300 text-[11px] italic mt-0.5">"{remarks}"</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-10 shadow-lg shadow-emerald-950/50 flex items-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>Confirm & Execute Transfer</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
