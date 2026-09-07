import React, { useRef } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import QRCodeSVG from 'react-qr-code';
import { Printer, ShieldCheck, Clock, Building2, User, CheckCircle, Package } from 'lucide-react';

export interface PassProductItem {
  name: string;
  productId: string;
  serialNumber?: string;
  imei?: string;
  model?: string;
  qrCode?: string;
}

export interface TemporaryPassData {
  transferId: string;
  fromBranch: string;
  toBranch: string;
  courier: {
    firstName: string;
    lastName: string;
    employeeId: string;
    phone?: string;
    avatar?: string;
    designation?: string;
  };
  items: PassProductItem[];
  assignedBy: string;
  assignedAt: string;
  validUntil: string;
  authCode: string;
}

interface TemporaryPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TemporaryPassData | null;
}

export const TemporaryPassModal: React.FC<TemporaryPassModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Temporary Dispatch Pass - ${data.transferId}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 12px;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .pass-card {
              border: 2px solid #0f172a;
              border-radius: 12px;
              padding: 24px;
              max-width: 720px;
              margin: 0 auto;
              background: #fff;
            }
            .pass-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 16px;
            }
            .brand-title {
              font-size: 24px;
              font-weight: 900;
              letter-spacing: 1.5px;
              color: #0f172a;
            }
            .pass-subtitle {
              font-size: 13px;
              font-weight: 700;
              color: #059669;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 2px;
            }
            .badge-verified {
              background: #ecfdf5;
              border: 1.5px solid #059669;
              color: #047857;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 16px;
            }
            .info-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 14px;
            }
            .box-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #64748b;
              margin-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 12px;
            }
            .label {
              color: #64748b;
              font-weight: 600;
            }
            .val {
              font-weight: 700;
              color: #0f172a;
              text-align: right;
            }
            .courier-highlight {
              display: flex;
              align-items: center;
              gap: 14px;
              margin-bottom: 6px;
            }
            .courier-avatar {
              width: 54px;
              height: 54px;
              border-radius: 8px;
              border: 1.5px solid #cbd5e1;
              object-cover: cover;
            }
            .courier-avatar-placeholder {
              width: 54px;
              height: 54px;
              border-radius: 8px;
              background: #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: 800;
              color: #475569;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 14px 0;
              font-size: 11px;
            }
            .items-table th {
              background: #0f172a;
              color: #ffffff;
              padding: 8px 10px;
              text-align: left;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .items-table td {
              padding: 8px 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
            }
            .items-table tr:nth-child(even) {
              background: #f8fafc;
            }
            .qr-center-box {
              display: flex;
              align-items: center;
              justify-content: space-around;
              background: #f8fafc;
              border: 1.5px dashed #0f172a;
              border-radius: 10px;
              padding: 14px;
              margin: 16px 0;
            }
            .qr-text-info {
              max-width: 60%;
            }
            .validity-banner {
              background: #0f172a;
              color: #ffffff;
              text-align: center;
              padding: 8px 14px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 1px;
              margin: 14px 0;
            }
            .signature-box {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-top: 1px solid #cbd5e1;
              padding-top: 14px;
              margin-top: 14px;
            }
            .sig-col {
              text-align: center;
              font-size: 10px;
            }
            .sig-line {
              width: 140px;
              border-top: 1px dashed #64748b;
              margin-bottom: 4px;
            }
            .security-notice {
              font-size: 9px;
              color: #64748b;
              text-align: center;
              margin-top: 12px;
              border-top: 1px solid #f1f5f9;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1 text-slate-100">
        
        {/* Pass Header Banner */}
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-300">Temporary Dispatch Pass Generated</h3>
              <p className="text-xs text-emerald-400/80">Courier OTP verified & authorized for warehouse gate exit clearance.</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/40 text-[10px] font-mono">
            OTP AUTHENTICATED
          </Badge>
        </div>

        {/* Printable Pass Container */}
        <div ref={printRef} className="pass-card bg-white text-slate-900 rounded-xl p-5 border-2 border-slate-800 shadow-2xl font-sans">
          
          {/* Header */}
          <div className="pass-header flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-3">
            <div>
              <div className="brand-title text-xl font-black tracking-wider text-slate-950">ARSHI ENTERPRISE</div>
              <div className="pass-subtitle text-xs font-bold text-emerald-700 tracking-wide uppercase">
                Official Temporary Dispatch Pass
              </div>
            </div>
            <div className="text-right">
              <div className="badge-verified inline-block bg-emerald-50 border border-emerald-600 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                ✓ OTP Verified
              </div>
              <div className="text-[11px] font-mono text-slate-600 font-bold mt-1">
                TRF: {data.transferId}
              </div>
            </div>
          </div>

          {/* Courier & Route Grid */}
          <div className="meta-grid grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            
            {/* Courier Details */}
            <div className="info-box bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <div className="box-title text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-1 mb-2 border-b border-slate-200 flex items-center space-x-1">
                <User className="h-3 w-3 text-slate-600" />
                <span>Courier Boy Information</span>
              </div>
              <div className="courier-highlight flex items-center space-x-3 mb-2">
                {data.courier.avatar ? (
                  <img src={data.courier.avatar} alt="Courier" className="courier-avatar w-12 h-12 rounded-lg border border-slate-300 object-cover" />
                ) : (
                  <div className="courier-avatar-placeholder w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                    {data.courier.firstName[0]}{data.courier.lastName[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold text-sm text-slate-900">{data.courier.firstName} {data.courier.lastName}</div>
                  <div className="font-mono text-[11px] text-slate-600 font-semibold">ID: {data.courier.employeeId}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{data.courier.designation || 'Delivery Staff'}</div>
                </div>
              </div>
              <div className="row flex justify-between text-[11px] pt-1 border-t border-slate-200">
                <span className="label text-slate-500 font-medium">Mobile Phone:</span>
                <span className="val font-bold text-slate-900">{data.courier.phone || 'N/A'}</span>
              </div>
            </div>

            {/* Route & Authorization */}
            <div className="info-box bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <div className="box-title text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-1 mb-2 border-b border-slate-200 flex items-center space-x-1">
                <Building2 className="h-3 w-3 text-slate-600" />
                <span>Route & Authorization</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="row flex justify-between">
                  <span className="label text-slate-500 font-medium">From Branch:</span>
                  <span className="val font-bold text-slate-900">{data.fromBranch}</span>
                </div>
                <div className="row flex justify-between">
                  <span className="label text-slate-500 font-medium">To Destination:</span>
                  <span className="val font-bold text-slate-900">{data.toBranch}</span>
                </div>
                <div className="row flex justify-between">
                  <span className="label text-slate-500 font-medium">Assigned By:</span>
                  <span className="val font-bold text-slate-900">{data.assignedBy}</span>
                </div>
                <div className="row flex justify-between">
                  <span className="label text-slate-500 font-medium">Issued Time:</span>
                  <span className="val font-bold text-slate-900">{data.assignedAt}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Product Manifest Table */}
          <div className="mb-3">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Package className="h-3 w-3" />
              <span>Assigned Product Hardware Manifest ({data.items.length} item{data.items.length > 1 ? 's' : ''})</span>
            </div>
            <table className="items-table w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold">
                  <th className="p-2 text-left">Product Name</th>
                  <th className="p-2 text-left">Product ID</th>
                  <th className="p-2 text-left">Serial Number</th>
                  <th className="p-2 text-left">IMEI Number</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 text-[11px] font-medium">
                    <td className="p-2 font-bold text-slate-900">{item.name}</td>
                    <td className="p-2 font-mono text-slate-700">{item.productId}</td>
                    <td className="p-2 font-mono text-slate-800 font-bold">{item.serialNumber || 'N/A'}</td>
                    <td className="p-2 font-mono text-slate-800 font-bold">{item.imei || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* QR Code & Digital Verification Box */}
          <div className="qr-center-box flex items-center justify-between bg-slate-50 border-2 border-dashed border-slate-400 rounded-xl p-3.5 my-3">
            <div className="qr-text-info max-w-[65%] space-y-1">
              <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>Gate Scanner Quick Code</span>
              </div>
              <p className="text-[10px] text-slate-600 leading-snug">
                Scan this QR at Origin Exit Gate and Destination Entry Gate. It validates the Courier, Dispatch Order, and hardware serial numbers.
              </p>
              <div className="pt-1">
                <span className="text-[9px] font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                  AUTH: {data.authCode}
                </span>
              </div>
            </div>
            <div className="p-1.5 bg-white border border-slate-300 rounded-lg shadow-sm shrink-0">
              <QRCodeSVG 
                value={JSON.stringify({
                  pass: 'ARSHI_TEMP_PASS',
                  trf: data.transferId,
                  auth: data.authCode,
                  emp: data.courier.employeeId,
                  items: data.items.map(i => ({ id: i.productId, sn: i.serialNumber, imei: i.imei })),
                  validUntil: data.validUntil
                })}
                size={85}
              />
            </div>
          </div>

          {/* 24-Hour Validity Banner */}
          <div className="validity-banner bg-slate-950 text-white text-center py-2 px-4 rounded-lg text-xs font-black tracking-wider flex items-center justify-center space-x-2 my-2">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>PASS VALID FOR 24 HOURS • EXPIRY: {data.validUntil}</span>
          </div>

          {/* Signatures & Security */}
          <div className="signature-box flex items-end justify-between border-t border-slate-200 pt-3 mt-3 text-[10px]">
            <div className="sig-col text-center">
              <div className="sig-line w-28 border-t border-dashed border-slate-400 mb-1 mx-auto"></div>
              <span className="text-slate-600 font-bold">Courier Signature</span>
            </div>
            <div className="sig-col text-center">
              <div className="font-bold text-slate-900 font-mono text-[9px] mb-0.5">{data.authCode}</div>
              <div className="sig-line w-32 border-t border-dashed border-slate-400 mb-1 mx-auto"></div>
              <span className="text-slate-600 font-bold">Authorized Manager: {data.assignedBy}</span>
            </div>
          </div>

          <div className="security-notice text-[8px] text-slate-400 text-center mt-2 border-t border-slate-100 pt-1">
            Official Clearance Document of Arshi Enterprise • Non-Transferable • Void if tampered
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-2">
            <Printer className="h-4 w-4" />
            <span>Print Official Temporary Pass</span>
          </Button>
        </div>

      </div>
    </Dialog>
  );
};

export default TemporaryPassModal;
