import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { 
  Download, 
  Printer, 
  Route, 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  MapPin,
  Clock,
  Compass
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { RouteHistoryModal } from '../components/RouteHistoryModal';
import { motion, AnimatePresence } from 'framer-motion';

interface DutySessionReport {
  _id: string;
  staffId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
    phone: string;
  };
  branchId: {
    _id: string;
    name: string;
    code: string;
  };
  startTime: string;
  endTime?: string;
  status: 'ON_DUTY' | 'OFF_DUTY' | 'PAUSED';
  totalDistanceKm: number;
  exitGateNumber?: string;
  entryGateNumber?: string;
  movingTimeMinutes?: number;
  idleTimeMinutes?: number;
}

export const TrackingReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DutySessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyModalSessionId, setHistoryModalSessionId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<{ [key: string]: boolean }>({});

  const { user } = useAuthStore();

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches', { params: { limit: 100 } });
      setBranches(res.data.data);
    } catch {
      // optional
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tracking/reports', {
        params: {
          page,
          limit: 10,
          branchId: selectedBranchId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      const data = response.data.data;
      setReports(data);
      setTotalPages(response.data.meta?.pages || 1);
      
      // Auto-expand the first date group by default
      if (data.length > 0) {
        const firstDate = new Date(data[0].startTime);
        const firstKey = firstDate.toISOString().split('T')[0];
        setExpandedDates(prev => ({
          [firstKey]: true,
          ...prev
        }));
      }
    } catch (err: any) {
      toast.error('Failed to load tracking reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [page, selectedBranchId, startDate, endDate]);

  const handleExportCSV = () => {
    if (reports.length === 0) {
      toast.error('No report data available to export');
      return;
    }

    const headers = ['Duty Session ID', 'Staff Name', 'Employee ID', 'Branch', 'Duty Status', 'Start Time (Exit)', 'End Time (Entry)', 'Distance (KM)'];
    const rows = reports.map(r => [
      r._id,
      r.staffId ? `${r.staffId.firstName} ${r.staffId.lastName}` : 'N/A',
      r.staffId?.employeeId || 'N/A',
      r.branchId?.name || 'N/A',
      r.status,
      r.startTime ? new Date(r.startTime).toLocaleString('en-IN') : 'N/A',
      r.endTime ? new Date(r.endTime).toLocaleString('en-IN') : 'N/A',
      r.totalDistanceKm ? r.totalDistanceKm.toFixed(2) : '0'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Duty_Tracking_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV Report exported successfully');
  };

  // Grouping helper
  const getGroupedReports = () => {
    const groups: { 
      [dateKey: string]: { 
        dateString: string; 
        items: DutySessionReport[]; 
        totalDistance: number; 
        totalSessions: number;
      } 
    } = {};

    reports.forEach((report) => {
      if (!report.startTime) return;
      const d = new Date(report.startTime);
      const dateKey = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      if (!groups[dateKey]) {
        const formattedDate = d.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        groups[dateKey] = {
          dateString: formattedDate,
          items: [],
          totalDistance: 0,
          totalSessions: 0
        };
      }

      groups[dateKey].items.push(report);
      groups[dateKey].totalDistance += report.totalDistanceKm || 0;
      groups[dateKey].totalSessions += 1;
    });

    // Sort dates descending
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({
        dateKey: key,
        ...groups[key]
      }));
  };

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const groupedData = getGroupedReports();

  return (
    <div className="space-y-6 pb-8">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader
        title="Duty & Location Tracking Reports"
        subtitle="Historical logs of courier duty sessions, travel distances, and entry/exit timestamps"
      >
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center space-x-1 border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800">
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </Button>
          <Button size="sm" onClick={handleExportCSV} className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </PageHeader>

      {/* Control Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 backdrop-blur-md p-4 border border-slate-800/80 rounded-xl">
        {user?.role === 'super_admin' && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Filter Branch</label>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border-slate-800 text-slate-100"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border-slate-800 text-slate-100"
          />
        </div>
      </div>

      {/* Reports Content */}
      <div className="space-y-4">
        {loading ? (
          // Loading Skeletons
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-slate-900/20 border border-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : groupedData.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center p-12 bg-slate-900/20 border border-slate-800/80 rounded-2xl text-center space-y-3">
            <div className="p-3 bg-slate-800/40 rounded-full text-slate-400">
              <Calendar className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">No Duty Reports Found</h3>
              <p className="text-sm text-slate-500 mt-1">There are no recorded courier duty sessions matching your filter criteria.</p>
            </div>
          </div>
        ) : (
          // Grouped Accordion List
          groupedData.map((group) => {
            const isExpanded = !!expandedDates[group.dateKey];
            return (
              <div 
                key={group.dateKey}
                className="overflow-hidden border border-slate-800/80 bg-slate-900/10 backdrop-blur-md rounded-xl transition-all duration-300"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleDateGroup(group.dateKey)}
                  className="w-full flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950/45 hover:bg-slate-950/70 border-b border-slate-800/60 text-left transition-colors duration-200 space-y-2 md:space-y-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-lg">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm md:text-base">
                        {group.dateString}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{group.dateKey}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-slate-900 text-slate-400 border-slate-800 font-mono">
                        {group.totalSessions} {group.totalSessions === 1 ? 'Session' : 'Sessions'}
                      </Badge>
                      <Badge className="bg-emerald-600/10 text-emerald-400 border-emerald-500/20 font-mono flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{group.totalDistance.toFixed(2)} km covered</span>
                      </Badge>
                    </div>
                    
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-slate-400"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </motion.div>
                  </div>
                </button>

                {/* Accordion Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-950/20 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/40">
                              <th className="py-3 px-4">Courier / Staff</th>
                              <th className="py-3 px-4">Branch</th>
                              <th className="py-3 px-4">Duty Start (Gate Exit)</th>
                              <th className="py-3 px-4">Duty End (Gate Entry)</th>
                              <th className="py-3 px-4">Distance</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Route</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {group.items.map((item) => (
                              <tr 
                                key={item._id} 
                                className="hover:bg-slate-900/20 text-xs text-slate-300 transition-colors duration-150"
                              >
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="font-bold text-slate-200">
                                      {item.staffId ? `${item.staffId.firstName} ${item.staffId.lastName}` : 'N/A'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      {item.staffId?.employeeId || 'N/A'}
                                    </p>
                                  </div>
                                </td>
                                
                                <td className="py-3 px-4 text-slate-400">
                                  <div className="flex items-center space-x-1.5">
                                    <Compass className="h-3.5 w-3.5 text-indigo-400/80" />
                                    <span>{item.branchId?.name || 'Central Head Office'}</span>
                                  </div>
                                </td>

                                <td className="py-3 px-4 font-mono">
                                  <div className="flex items-center space-x-1.5">
                                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                                    <div>
                                      <span>
                                        {item.startTime ? new Date(item.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                      </span>
                                      {item.exitGateNumber && (
                                        <span className="ml-1.5 text-[9px] text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                                          {item.exitGateNumber}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 font-mono">
                                  <div className="flex items-center space-x-1.5">
                                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                                    <div>
                                      {item.endTime ? (
                                        <>
                                          <span>
                                            {new Date(item.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                          {item.entryGateNumber && (
                                            <span className="ml-1.5 text-[9px] text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                                              {item.entryGateNumber}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-emerald-400 font-semibold animate-pulse">Active On Duty</span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                                  {item.totalDistanceKm ? `${item.totalDistanceKm.toFixed(2)} km` : '0.00 km'}
                                </td>

                                <td className="py-3 px-4">
                                  <Badge 
                                    variant={item.status === 'ON_DUTY' ? 'success' : 'secondary'}
                                    className="text-[9px] px-1.5 py-0.5 uppercase tracking-wider"
                                  >
                                    {item.status}
                                  </Badge>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setHistoryModalSessionId(item._id)}
                                    className="h-8 text-[11px] space-x-1 border-slate-800 bg-slate-950 hover:bg-slate-900 hover:text-white"
                                  >
                                    <Route className="h-3.5 w-3.5 text-indigo-400" />
                                    <span>Playback</span>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
          <div className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="h-8 px-2 border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="h-8 px-2 border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Route History Playback Modal */}
      {historyModalSessionId && (
        <RouteHistoryModal
          dutySessionId={historyModalSessionId}
          isOpen={!!historyModalSessionId}
          onClose={() => setHistoryModalSessionId(null)}
        />
      )}
    </div>
  );
};

export default TrackingReportsPage;
