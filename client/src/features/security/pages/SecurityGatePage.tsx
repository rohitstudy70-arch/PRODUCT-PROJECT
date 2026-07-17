import React, { useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { QRScanner } from '../../../components/shared/QRScanner';
import { Badge } from '../../../components/ui/badge';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const SecurityGatePage: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0); // 0 = scan staff QR, 1 = scan product QRs
  const [scanType, setScanType] = useState<'exit' | 'entry'>('exit');
  const [gateNumber, setGateNumber] = useState('Gate 1');
  const [transferData, setTransferData] = useState<any | null>(null);
  const [staffData, setStaffData] = useState<any | null>(null);
  
  const [scannedProductQrs, setScannedProductQrs] = useState<string[]>([]);
  const [scannedProducts, setScannedProducts] = useState<any[]>([]);

  // Discrepancy states
  const [missingItems, setMissingItems] = useState<any[]>([]);
  const [extraItems, setExtraItems] = useState<any[]>([]);

  const handleStaffQrScan = async (scannedCode: string) => {
    try {
      const response = await api.get(`/transfers/active-by-staff/${scannedCode.trim()}`, {
        params: { type: scanType }
      });
      const { transfer, staff } = response.data.data;

      setTransferData(transfer);
      setStaffData(staff);
      setActiveStep(1); // Advance directly to product scanning
      
      // Reset scanning tables
      setScannedProductQrs([]);
      setScannedProducts([]);
      setMissingItems(transfer.items);
      setExtraItems([]);

      toast.success(`Driver Verified: ${staff.firstName} ${staff.lastName}. Manifest loaded!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No active logistical route found for this staff member';
      toast.error(msg);
    }
  };

  const handleProductQrScan = async (scannedCode: string) => {
    if (!transferData) return;

    if (scannedProductQrs.includes(scannedCode)) {
      toast.warning('Tag has already been scanned');
      return;
    }

    try {
      const prodRes = await api.get('/products', { params: { limit: 100 } });
      const matchedProduct = prodRes.data.data.find(
        (p: any) => p.qrCode === scannedCode || p.serialNumber === scannedCode || p.productId === scannedCode
      );

      if (!matchedProduct) {
        toast.error('Scanned tag is not registered in catalog');
        return;
      }

      const updatedQrs = [...scannedProductQrs, scannedCode];
      setScannedProductQrs(updatedQrs);
      
      const updatedProds = [...scannedProducts, matchedProduct];
      setScannedProducts(updatedProds);

      // Recalculate discrepancies
      const manifestProductIds = transferData.items.map((i: any) => i.productId._id);
      const scannedProductIds = updatedProds.map(p => p._id);

      const missing = transferData.items.filter((i: any) => !scannedProductIds.includes(i.productId._id));
      setMissingItems(missing);

      const extra = updatedProds.filter(p => !manifestProductIds.includes(p._id));
      setExtraItems(extra);

      if (extra.length > 0) {
        toast.error(`Mismatch Detected: Product ${matchedProduct.productId} not on manifest!`);
      } else {
        toast.success(`Verified: ${matchedProduct.productId}`);
      }
    } catch (err) {
      toast.error('Error scanning product tag');
    }
  };

  const handleApproveClearance = async () => {
    if (!transferData || !staffData) return;

    if (extraItems.length > 0) {
      toast.error('Block Clearance: Extra assets detected inside cargo payload');
      return;
    }

    if (missingItems.length > 0 && scanType === 'exit') {
      toast.error('Block Clearance: All manifested products must be verified before exit');
      return;
    }

    try {
      const endpoint = scanType === 'exit' ? '/transfers/gate-exit' : '/transfers/gate-entry';
      const payload = {
        transferId: transferData._id,
        staffQrCode: staffData.qrCode,
        scannedProductQrs,
        gateNumber,
        notes: scanType === 'exit' ? 'Cleared security check at exit' : 'Cleared security check at entry'
      };

      const response = await api.post(endpoint, payload);
      toast.success(response.data.message);

      handleReset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Clearance transaction failed');
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setTransferData(null);
    setStaffData(null);
    setScannedProductQrs([]);
    setScannedProducts([]);
    setMissingItems([]);
    setExtraItems([]);
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader
        title="Gate Security Checkpoint"
        subtitle="Verification scanning gate: Scan staff ID first to load manifest route dynamically"
      />

      {/* Step 0: Scan Staff QR code to load transfer */}
      {activeStep === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-indigo-400" />
                <span>STEP 1: Verify Courier Custodian ID</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <QRScanner
                onScanSuccess={handleStaffQrScan}
                placeholder="Scan Staff QR card or enter employee ID"
              />
            </CardContent>
          </Card>

          {/* Right settings card */}
          <Card className="glass-card h-fit">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Scanner Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-400">Gate Location</label>
                <select
                  value={gateNumber}
                  onChange={(e) => setGateNumber(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="Gate 1">Gate 1 (Central)</option>
                  <option value="Gate 2">Gate 2 (Cargo)</option>
                  <option value="Gate 3">Gate 3 (Logistics)</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-400">Logistics Flow Mode</label>
                <select
                  value={scanType}
                  onChange={(e: any) => setScanType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="exit">Check Out (EXIT Gate)</option>
                  <option value="entry">Check In / Receive (ENTRY Gate)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Scan Product tags */}
      {activeStep === 1 && transferData && staffData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-3">
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <ShieldAlert className="h-5 w-5 text-indigo-400" />
                  <span>STEP 2: Scanned Cargo Verification ({scanType === 'exit' ? 'EXIT' : 'ENTRY'})</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleReset} className="text-xs flex items-center space-x-1">
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Session</span>
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <QRScanner
                  onScanSuccess={handleProductQrScan}
                  placeholder="Scan Product QR tag or Serial Code"
                />

                {/* Bottom approval action panel */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-6">
                  <div className="text-xs text-slate-400">
                    Verified items: <span className="font-bold text-white">{scannedProductQrs.length}</span> of {transferData.totalItems}
                  </div>
                  <Button
                    onClick={handleApproveClearance}
                    disabled={extraItems.length > 0 || (scanType === 'exit' && missingItems.length > 0)}
                    className="flex items-center space-x-1.5"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve Clearance</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mismatch warnings */}
            {(extraItems.length > 0 || missingItems.length > 0) && (
              <Card className="border-red-950 bg-red-950/20 backdrop-blur-md">
                <CardContent className="p-4 flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-2 w-full">
                    <h4 className="text-sm font-bold text-red-400">Cargo Discrepancies</h4>

                    {extraItems.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-red-300">Extra products (NOT in manifest, blocked):</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {extraItems.map(item => (
                            <Badge key={item._id} variant="destructive" className="text-[10px]">
                              {item.productId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {missingItems.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-yellow-400">
                          {scanType === 'exit'
                            ? 'Missing products (all must be scanned for exit check-out):'
                            : 'Missing products (alert logged to HQ on entry receipt):'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {missingItems.map(item => (
                            <Badge key={item._id} variant="warning" className="text-[10px]">
                              {item.productId?.productId || 'GPS'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar status */}
          <div className="space-y-6">
            {/* Courier Card */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Verified Courier Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 p-3 bg-slate-950/40 rounded-lg border border-slate-800/40">
                  <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center font-bold uppercase border border-emerald-500/20">
                    {staffData.firstName[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{`${staffData.firstName} ${staffData.lastName}`}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      Emp ID: {staffData.employeeId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manifest List Card */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Manifest List ({transferData.totalItems})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {transferData.items.map((item: any) => {
                    const isScanned = scannedProductQrs.includes(item.productId.qrCode) || 
                                     scannedProductQrs.includes(item.productId.serialNumber);

                    return (
                      <div
                        key={item._id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border ${
                          isScanned
                            ? 'bg-emerald-500/5 border-emerald-950/40 text-emerald-400'
                            : 'bg-slate-950/40 border-slate-800/40 text-slate-400'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{item.productId.name}</p>
                          <p className="text-[10px] font-mono mt-0.5">
                            ID: {item.productId.productId} | SN: {item.productId.serialNumber || 'N/A'}
                          </p>
                        </div>
                        {isScanned ? (
                          <Badge variant="success" className="text-[9px]">Scanned</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">Pending</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
export default SecurityGatePage;
