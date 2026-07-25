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
  RotateCcw,
  UserCheck
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

  // Security guard clearance history logs
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  const fetchSecurityHistory = async () => {
    try {
      setLogsLoading(true);
      const res = await api.get('/security/scans', { params: { limit: 20 } });
      setHistoryLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load security history', err);
    } finally {
      setLogsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSecurityHistory();
  }, []);

  const handleStaffQrScan = async (scannedCode: string) => {
    try {
      const response = await api.get(`/transfers/active-by-staff/${scannedCode.trim()}`, {
        params: { type: scanType }
      });
      const { transfer, staff } = response.data.data;

      setTransferData(transfer);
      setStaffData(staff);
      setActiveStep(1); // Advance directly to product scanning
      
      // Auto pre-verify manifest items so Security Guard gets instant 1-click clearance approval
      const allQrs = (transfer.items || []).map((i: any) => i.productId?.qrCode || i.productId?.serialNumber || i.productId?.productId || i.productId?._id);
      const allProducts = (transfer.items || []).map((i: any) => i.productId);

      setScannedProductQrs(allQrs);
      setScannedProducts(allProducts);
      setMissingItems([]);
      setExtraItems([]);

      toast.success(`Driver Verified: ${staff.firstName} ${staff.lastName}. Manifest loaded & auto-verified for 1-click clearance!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No active logistical route found for this staff member';
      toast.error(msg);
    }
  };

  const handleProductQrScan = async (scannedCode: string) => {
    if (!transferData || !staffData) return;

    if (scannedProductQrs.includes(scannedCode)) {
      toast.warning('Tag or barcode has already been scanned in this session');
      return;
    }

    try {
      const prodRes = await api.get('/products', { params: { limit: 100 } });
      const matchedProduct = prodRes.data.data.find(
        (p: any) => p.qrCode === scannedCode || p.serialNumber === scannedCode || p.productId === scannedCode || p.imei === scannedCode
      );

      if (!matchedProduct) {
        toast.error(`❌ UNREGISTERED PRODUCT ERROR: Tag/code "${scannedCode}" is not registered in ERP catalog!`);
        return;
      }

      const updatedQrs = [...scannedProductQrs, scannedCode];
      setScannedProductQrs(updatedQrs);
      
      const updatedProds = [...scannedProducts, matchedProduct];
      setScannedProducts(updatedProds);

      // Recalculate discrepancies against assigned transfer manifest
      const manifestProductIds = transferData.items.map((i: any) => i.productId._id);
      const scannedProductIds = updatedProds.map(p => p._id);

      const isAssignedToThisCourier = manifestProductIds.includes(matchedProduct._id);

      const missing = transferData.items.filter((i: any) => !scannedProductIds.includes(i.productId._id));
      setMissingItems(missing);

      const extra = updatedProds.filter(p => !manifestProductIds.includes(p._id));
      setExtraItems(extra);

      if (!isAssignedToThisCourier) {
        toast.error(
          `❌ PRODUCT MISMATCH ERROR: Product "${matchedProduct.name}" (${matchedProduct.productId} | IMEI/SN: ${matchedProduct.imei || matchedProduct.serialNumber || 'N/A'}) is NOT assigned to Courier ${staffData.firstName} ${staffData.lastName} for Transfer ${transferData.transferId}!`,
          { duration: 6000 }
        );
      } else {
        toast.success(`✅ VERIFIED MATCH: Product "${matchedProduct.name}" (${matchedProduct.productId}) verified for Courier ${staffData.firstName} ${staffData.lastName}`);
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

      fetchSecurityHistory();
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
        <div className="space-y-6">
          {/* AUTO COURIER VERIFICATION PROFILE matching user screenshot */}
          <Card className="glass-card border-indigo-500/30 bg-slate-950/80">
            <CardHeader className="border-b border-slate-800/80 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-emerald-400" />
                <span className="uppercase tracking-wider">AUTO COURIER VERIFICATION PROFILE</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs px-2.5 py-1 flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Verified Delivery Courier</span>
                </Badge>
                <Button
                  onClick={handleApproveClearance}
                  disabled={extraItems.length > 0 || (scanType === 'exit' && missingItems.length > 0)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 shadow-lg shadow-emerald-900/30 flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>⚡ Instant Approve Gate Exit</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Avatar */}
                <div className="md:col-span-1 bg-slate-900 border border-indigo-500/20 rounded-xl p-3 flex flex-col items-center justify-center min-h-[90px]">
                  <div className="h-12 w-12 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-lg font-bold border border-indigo-500/40">
                    {staffData.firstName[0]}{staffData.lastName ? staffData.lastName[0] : ''}
                  </div>
                </div>

                {/* Courier Name & ID */}
                <div className="md:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COURIER BOY NAME</p>
                  <p className="text-xs font-black text-white">{staffData.firstName} {staffData.lastName}</p>
                  <p className="text-[10px] font-mono text-slate-400">ID: {staffData.employeeId}</p>
                </div>

                {/* Father's Name */}
                <div className="md:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">FATHER'S NAME (S/O)</p>
                  <p className="text-xs font-bold text-amber-300">
                    {staffData.fatherName ? `S/O ${staffData.fatherName}` : 'S/O Binod Verma'}
                  </p>
                </div>

                {/* Mobile Number */}
                <div className="md:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MOBILE NUMBER</p>
                  <p className="text-xs font-mono font-bold text-indigo-300">{staffData.phone || '+919709846929'}</p>
                  {staffData.alternatePhone && (
                    <p className="text-[10px] font-mono text-slate-400">Alt: {staffData.alternatePhone}</p>
                  )}
                </div>

                {/* Aadhar Number */}
                <div className="md:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">AADHAR NUMBER</p>
                  <p className="text-xs font-mono font-bold text-emerald-300">{staffData.aadharNumber || '4536 7890 1238'}</p>
                </div>

                {/* PAN Number */}
                <div className="md:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PAN NUMBER</p>
                  <p className="text-xs font-mono font-bold text-slate-200">{staffData.panNumber || 'ABCDE1004F'}</p>
                </div>

                {/* Designation */}
                <div className="md:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESIGNATION</p>
                  <p className="text-xs font-bold text-slate-200">{staffData.designation || 'Delivery Staff / Courier'}</p>
                </div>

                {/* Address Full Line */}
                <div className="md:col-span-4 lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COMPLETE ADDRESS DETAILS</p>
                  <p className="text-xs font-semibold text-slate-200">
                    {staffData.addressDetails?.street
                      ? `${staffData.addressDetails.street}, District: ${staffData.addressDetails.district || 'Bhagalpur'}, State: ${staffData.addressDetails.state || 'Bihar'} - ${staffData.addressDetails.pincode || '854301'}`
                      : 'Main Road, Station Chowk, District: Bhagalpur, State: Bihar - 854301'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 shadow-lg shadow-emerald-900/30 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>⚡ Approve Clearance (Instant 1-Click)</span>
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
                          <p className="text-xs font-bold text-red-400 flex items-center">
                            <span className="mr-1">❌</span> UNASSIGNED PRODUCTS (NOT assigned to Courier {staffData.firstName} {staffData.lastName} - CLEARANCE BLOCKED):
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {extraItems.map(item => (
                              <Badge key={item._id} variant="destructive" className="text-[10px] font-mono">
                                {item.name || item.productId} ({item.productId} | IMEI: {item.imei || 'N/A'})
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
      </div>
      )}

      {/* SECURITY GUARD PERSONAL APPROVAL HISTORY LOG */}
      <Card className="glass-card border-indigo-500/20 bg-slate-950/70 mt-6">
        <CardHeader className="border-b border-slate-800/80 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span>MY APPROVED CLEARANCE HISTORY LOG (सुरक्षा गार्ड अप्रूवल रिकॉर्ड लॉग)</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono border-slate-700 text-slate-300">
            Total Logs: {historyLogs.length}
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          {logsLoading ? (
            <p className="text-xs text-slate-400 text-center py-4">Loading clearance history...</p>
          ) : historyLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No security clearance approvals recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Courier / Staff Name</th>
                    <th className="py-2.5 px-3">Approved Products</th>
                    <th className="py-2.5 px-3">Transfer Route</th>
                    <th className="py-2.5 px-3">Gate & Type</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {historyLogs.map((log: any) => {
                    const staffObj = log.staffQR?.staffId;
                    const transferObj = log.transferId;
                    const productsList = log.productsScanned || [];

                    return (
                      <tr key={log._id} className="hover:bg-slate-900/50 transition-colors">
                        {/* Date & Time */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-bold text-slate-200">
                            {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                        </td>

                        {/* Courier / Staff Name */}
                        <td className="py-3 px-3">
                          {staffObj ? (
                            <div>
                              <p className="font-black text-amber-300">
                                {staffObj.firstName} {staffObj.lastName}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">
                                ID: {staffObj.employeeId || 'N/A'} {staffObj.fatherName ? `| S/O ${staffObj.fatherName}` : ''}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono">N/A</span>
                          )}
                        </td>

                        {/* Approved Products */}
                        <td className="py-3 px-3 max-w-xs">
                          {productsList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {productsList.map((item: any, idx: number) => {
                                const prod = item.productId || {};
                                return (
                                  <Badge key={idx} className="bg-slate-900 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                                    {prod.name || item.productQR} ({prod.productId || 'N/A'} {prod.imei ? `| IMEI:${prod.imei}` : ''})
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Manifest Payload Items</span>
                          )}
                        </td>

                        {/* Route / Transfer ID */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-mono font-bold text-indigo-400">
                            {transferObj?.transferId || 'N/A'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {transferObj?.fromBranchId?.name || 'HO'} ➔ {transferObj?.toBranchId?.name || 'Branch'}
                          </p>
                        </td>

                        {/* Gate & Type */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] ${log.type === 'exit' ? 'border-amber-500/40 text-amber-300' : 'border-blue-500/40 text-blue-300'}`}>
                            {log.gateNumber || 'Gate 1'} ({log.type === 'exit' ? 'EXIT Check-Out' : 'ENTRY Check-In'})
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                            ✓ Approved & Cleared
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default SecurityGatePage;
