import React, { useState, useEffect, useRef } from 'react';
import { Search, QrCode, X, Clock, ArrowRight, Package, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Dialog } from '../../../components/ui/dialog';
import { QRScanner } from '../../../components/shared/QRScanner';
import api from '../../../config/api';

interface IMEISearchBarProps {
  onSelectProduct: (product: any) => void;
}

export const IMEISearchBar: React.FC<IMEISearchBarProps> = ({ onSelectProduct }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('arshi_recent_imei_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches');
      }
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const filtered = recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
    const updated = [term, ...filtered].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('arshi_recent_imei_searches', JSON.stringify(updated));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        fetchSuggestions(query.trim());
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const fetchSuggestions = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await api.get('/products/search', {
        params: { q: searchQuery }
      });
      setSuggestions(response.data.data || []);
      setShowDropdown(true);
    } catch (err) {
      console.error('Error fetching product search suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (product: any) => {
    const term = product.imei || product.productId || product.name;
    saveRecentSearch(term);
    setShowDropdown(false);
    onSelectProduct(product);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    } else {
      fetchSuggestions(query.trim());
    }
  };

  const handleQRScanSuccess = (scannedCode: string) => {
    setQrModalOpen(false);
    setQuery(scannedCode);
    fetchSuggestions(scannedCode);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'assigned': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'in_transit': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'delivered': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'blocked': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'lost': return 'bg-slate-700/50 text-slate-300 border-slate-600';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="w-full space-y-3 relative z-30" ref={dropdownRef}>
      {/* Main Glassmorphism Search Container */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-4 md:p-6 shadow-2xl shadow-indigo-950/40 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">
                Enterprise Product Transfer & IMEI Tracking
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Instant hardware lookup. Search by IMEI, Product ID, or QR tag to transfer devices across branches.
            </p>
          </div>

          <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-950/40 text-xs px-3 py-1 font-mono">
            ⚡ Live Inventory Search Engine
          </Badge>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder="Search Product by IMEI Number (e.g. 869845612345678), Product ID, or QR Code..."
              className="h-12 pl-12 pr-10 bg-slate-950/80 border-slate-800 text-slate-100 text-sm font-mono placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-xl shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setShowDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Buttons */}
          <Button
            type="submit"
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-950/60 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setQrModalOpen(true)}
            className="h-12 px-4 border-indigo-500/40 hover:border-indigo-500 text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/40 rounded-xl flex items-center space-x-2 cursor-pointer"
            title="Scan Product QR Tag via Camera"
          >
            <QrCode className="h-5 w-5" />
            <span className="hidden md:inline text-xs font-semibold">Scan QR</span>
          </Button>
        </form>

        {/* Recent Searches Tags */}
        {recentSearches.length > 0 && (
          <div className="mt-3 flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center shrink-0">
              <Clock className="h-3 w-3 mr-1 text-slate-500" />
              Recent:
            </span>
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(term);
                  fetchSuggestions(term);
                }}
                className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40 font-mono text-[11px] shrink-0 transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Auto-Suggestions Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-indigo-500" />
                <span>Searching product database...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <Package className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">Product Not Found</p>
                <p className="text-xs text-slate-500">No hardware found matching "{query}". Check IMEI or Product ID.</p>
              </div>
            ) : (
              suggestions.map((item) => {
                const branchName = item.currentBranchId ? item.currentBranchId.name : 'Central Main Stock';
                return (
                  <div
                    key={item._id}
                    onClick={() => handleSelect(item)}
                    className="p-3 hover:bg-slate-800/60 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                          {item.name}
                        </p>
                        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 mt-0.5">
                          <span>ID: {item.productId}</span>
                          <span>•</span>
                          <span>IMEI: {item.imei || 'N/A'}</span>
                          <span>•</span>
                          <span className="text-indigo-400 font-semibold">{branchName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getBadgeVariant(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Camera QR Scanner Dialog */}
      <Dialog isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Scan Product Tag QR Code">
        <div className="p-4 space-y-4 text-center">
          <p className="text-xs text-slate-400">
            Align the product QR label code inside the camera viewfinder to instantly load hardware details.
          </p>
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-2">
            <QRScanner
              onScanSuccess={handleQRScanSuccess}
              placeholder="Scan QR code tag"
            />
          </div>
          <Button variant="outline" onClick={() => setQrModalOpen(false)} className="w-full">
            Cancel Scan
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
