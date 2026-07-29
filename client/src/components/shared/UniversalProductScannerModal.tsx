import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, QrCode, Search, Package, MapPin, User, Tag, 
  ArrowRight, Printer, AlertTriangle, X
} from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { QRScanner } from './QRScanner';
import api from '../../config/api';
import { toast } from 'sonner';

interface UniversalProductScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: any) => void;
}

export const UniversalProductScannerModal: React.FC<UniversalProductScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [matchedList, setMatchedList] = useState<any[]>([]);
  const [cameraMode, setCameraMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setProduct(null);
      setMatchedList([]);
      setCameraMode(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSearch = async (codeToSearch: string) => {
    const term = codeToSearch.trim();
    if (!term) return;

    setLoading(true);
    setProduct(null);
    setMatchedList([]);

    try {
      const res = await api.get('/products/search', { params: { q: term } });
      const results = res.data?.data || [];
      setMatchedList(results);

      if (results.length === 1) {
        setProduct(results[0]);
        toast.success(`Found: ${results[0].name} (${results[0].model || results[0].productId})`);
      } else if (results.length > 1) {
        setProduct(results[0]);
        toast.info(`Found ${results.length} matching products. Showing first match.`);
      } else {
        toast.error(`No product found matching "${term}". Check IMEI, Serial No, or Product ID.`);
      }
    } catch (err: any) {
      console.error('Error scanning product:', err);
      toast.error('Failed to search product database');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(query);
    }
  };

  const handleCameraScan = (scannedText: string) => {
    setCameraMode(false);
    setQuery(scannedText);
    handleSearch(scannedText);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'assigned': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'in_transit': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'delivered': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'blocked': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'missing': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'lost': return 'bg-slate-700 text-slate-300 border-slate-600';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="⚡ Universal Product Scanner & IMEI Lookup">
      <div className="space-y-5 p-1 max-w-2xl mx-auto">
        {/* Top Scan Bar */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-indigo-500/30 space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scan className="h-5 w-5 text-indigo-400 animate-pulse" />
              <span className="text-sm font-bold text-slate-200">Scan Product Code</span>
            </div>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-950/40 text-[10px]">
              USB Barcode / RFID / Camera Compatible
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan Barcode, IMEI Number, Serial No, RFID Tag, or Product ID..."
                className="pl-9 pr-8 bg-slate-950 border-slate-800 text-slate-100 font-mono text-sm h-11"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setProduct(null);
                    setMatchedList([]);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              type="button"
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-1.5"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Lookup</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setCameraMode(!cameraMode)}
              className={`h-11 px-3 border-indigo-500/40 ${cameraMode ? 'bg-indigo-600 text-white' : 'bg-indigo-950/30 text-indigo-300'}`}
              title="Camera QR Code Scanner"
            >
              <QrCode className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Camera Viewfinder */}
        {cameraMode && (
          <div className="border border-indigo-500/40 rounded-xl overflow-hidden bg-slate-950 p-3 space-y-2">
            <p className="text-xs text-center text-indigo-300 font-medium">
              Point your phone or webcam camera at the product barcode / QR tag
            </p>
            <QRScanner
              onScanSuccess={handleCameraScan}
              placeholder="Scan Barcode or QR Code"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCameraMode(false)}
              className="w-full h-8 text-xs"
            >
              Close Camera Viewfinder
            </Button>
          </div>
        )}

        {/* Multiple Matches Selection List */}
        {matchedList.length > 1 && (
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-slate-400">
              Found {matchedList.length} matching products. Select to view details:
            </p>
            <div className="flex flex-wrap gap-2">
              {matchedList.map((item) => (
                <button
                  key={item._id}
                  onClick={() => setProduct(item)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all text-left ${
                    product?._id === item._id
                      ? 'bg-indigo-950 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold">{item.name}</span> ({item.model || item.productId})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product Details Display Card */}
        {product ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
            {/* Header / Title & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Package className="h-6 w-6 text-indigo-400" />
                  <h3 className="text-lg font-bold text-slate-100">{product.name}</h3>
                </div>
                <p className="text-xs text-slate-400 flex items-center space-x-2 font-mono">
                  <span>Category: <strong className="text-indigo-300">{product.category?.name || 'General Hardware'}</strong></span>
                  {product.model && (
                    <>
                      <span>•</span>
                      <span>Model: <strong className="text-purple-300">{product.model}</strong></span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadgeVariant(product.status)}`}>
                  {product.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Core Identification Identifiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* IMEI Number */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-indigo-500/20 space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                  <Tag className="h-3 w-3 mr-1 text-indigo-400" />
                  IMEI Number
                </p>
                <p className="text-sm font-bold font-mono text-indigo-300 break-all">
                  {product.imei || 'N/A'}
                </p>
              </div>

              {/* Serial Number */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-500/20 space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                  <Tag className="h-3 w-3 mr-1 text-purple-400" />
                  Serial Number
                </p>
                <p className="text-sm font-bold font-mono text-purple-300 break-all">
                  {product.serialNumber || 'N/A'}
                </p>
              </div>

              {/* Product SKU / ID */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-emerald-500/20 space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                  <Package className="h-3 w-3 mr-1 text-emerald-400" />
                  Product SKU / ID
                </p>
                <p className="text-sm font-bold font-mono text-emerald-300 break-all">
                  {product.productId}
                </p>
              </div>
            </div>

            {/* Secondary Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {/* Model Name */}
              <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Model Name</span>
                <span className="font-semibold text-slate-200">{product.model || 'N/A'}</span>
              </div>

              {/* RFID Tag UID */}
              <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">RFID Tag UID</span>
                <span className="font-semibold font-mono text-indigo-300">{product.rfidTag || 'Not Tagged'}</span>
              </div>

              {/* Rack Number */}
              <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Storage Rack</span>
                <span className="font-semibold text-emerald-400">{product.rackNumber || 'RACK-01'}</span>
              </div>

              {/* Vendor / Brand */}
              <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Vendor / Brand</span>
                <span className="font-semibold text-slate-200">{product.vendor || 'N/A'}</span>
              </div>

              {/* Batch Number */}
              <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Batch / Lot</span>
                <span className="font-semibold text-slate-200">{product.batch || 'N/A'}</span>
              </div>

              {/* Purchase Date */}
              <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Purchase Date</span>
                <span className="font-semibold text-slate-300">
                  {product.purchaseDate ? new Date(product.purchaseDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Location & Current Holder Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-500/30 space-y-1">
                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                  Current Branch Location
                </p>
                <p className="text-sm font-bold text-slate-100">
                  {product.currentBranchId ? product.currentBranchId.name : 'Central Head Office Stock'}
                </p>
                {product.currentBranchId?.address && (
                  <p className="text-[11px] text-slate-400 truncate">{product.currentBranchId.address}</p>
                )}
              </div>

              <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-500/30 space-y-1">
                <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider flex items-center">
                  <User className="h-3.5 w-3.5 mr-1 text-purple-400" />
                  Current Holder / Courier Staff
                </p>
                {product.currentHolderId ? (
                  <div>
                    <p className="text-sm font-bold text-slate-100">
                      {product.currentHolderId.firstName} {product.currentHolderId.lastName}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      ID: {product.currentHolderId.employeeId} | {product.currentHolderId.phone}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No individual staff assigned (In Branch Storage)</p>
                )}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              {onSelectProduct && (
                <Button
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs space-x-1"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Select Product</span>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  toast.info(`Product QR Code: ${product.qrCode || product.productId}`);
                }}
                className="text-xs space-x-1"
              >
                <Printer className="h-4 w-4 text-slate-400" />
                <span>Print QR Label</span>
              </Button>
            </div>
          </div>
        ) : !loading && query && (
          <div className="p-8 text-center text-slate-500 space-y-2 border border-slate-800 rounded-xl bg-slate-950/50">
            <AlertTriangle className="h-10 w-10 mx-auto text-amber-500/60" />
            <p className="text-sm font-bold text-slate-300">No Product Found</p>
            <p className="text-xs text-slate-400">
              No matching hardware found for "{query}". Verify IMEI, Serial Number, or Product ID.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
};
