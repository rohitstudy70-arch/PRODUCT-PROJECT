import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { StatCard } from '../../../components/shared/StatCard';
import {
  Package,
  CheckCircle,
  Truck,
  UserCheck,
  AlertTriangle,
  ArrowRightLeft,
  Settings,
  XOctagon,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import api from '../../../config/api';

interface Stats {
  totalProducts: number;
  availableProducts: number;
  inTransitProducts: number;
  assignedProducts: number;
  missingProducts: number;
  scrappedProducts: number;
  todayTransfers: number;
  completedTransfers: number;
  pendingTransfers: number;
  rejectedScans: number;
  branchStocks: any[];
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data.data);
      } catch (err) {
        console.error('Error fetching dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center Dashboard"
        subtitle="Real-time multi-branch asset transfers and inventory health metrics"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          icon={Package}
          colorClass="text-indigo-400"
          description="Assets registered in database"
        />
        <StatCard
          title="Available Stock"
          value={stats?.availableProducts || 0}
          icon={CheckCircle}
          colorClass="text-emerald-400"
          description="Available for dispatch transfers"
        />
        <StatCard
          title="In Transit"
          value={stats?.inTransitProducts || 0}
          icon={Truck}
          colorClass="text-blue-400"
          description="Currently moving on routes"
        />
        <StatCard
          title="Assigned to Staff"
          value={stats?.assignedProducts || 0}
          icon={UserCheck}
          colorClass="text-purple-400"
          description="In custody of staff / field reps"
        />
        <StatCard
          title="Missing / Mismatch"
          value={stats?.missingProducts || 0}
          icon={AlertTriangle}
          colorClass="text-amber-400"
          description="Discrepancy alert items"
        />
        <StatCard
          title="Transfers Today"
          value={stats?.todayTransfers || 0}
          icon={ArrowRightLeft}
          colorClass="text-pink-400"
          description="New transfers registered today"
        />
        <StatCard
          title="Completed Transfers"
          value={stats?.completedTransfers || 0}
          icon={TrendingUp}
          colorClass="text-indigo-400"
          description="Successful inbound arrivals"
        />
        <StatCard
          title="Gate Scan Rejections"
          value={stats?.rejectedScans || 0}
          icon={XOctagon}
          colorClass="text-red-400"
          description="Failed security gate checks"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Branch stock allocation */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Boxes className="h-5 w-5 text-indigo-400" />
              <span>Branch Stock Allocation Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.branchStocks && stats.branchStocks.length > 0 ? (
              <div className="space-y-4">
                {stats.branchStocks.map((branch, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/40 rounded-lg border border-slate-800/40">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">{branch.branchName}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        Code: {branch.branchCode}
                      </p>
                    </div>
                    <span className="h-7 px-3 bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center rounded-full">
                      {branch.count} Items
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                No branch stock reports generated.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Settings className="h-5 w-5 text-indigo-400" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-slate-950/40 hover:bg-indigo-600/10 cursor-pointer rounded-lg border border-slate-800/40 transition-colors">
              <h4 className="text-sm font-bold text-slate-200">Register New Asset</h4>
              <p className="text-xs text-slate-500 mt-0.5">Add products and auto-assign unique tags</p>
            </div>
            <div className="p-3 bg-slate-950/40 hover:bg-indigo-600/10 cursor-pointer rounded-lg border border-slate-800/40 transition-colors">
              <h4 className="text-sm font-bold text-slate-200">Initiate Asset Transfer</h4>
              <p className="text-xs text-slate-500 mt-0.5">Start a multi-branch logistical route</p>
            </div>
            <div className="p-3 bg-slate-950/40 hover:bg-indigo-600/10 cursor-pointer rounded-lg border border-slate-800/40 transition-colors">
              <h4 className="text-sm font-bold text-slate-200">Onboard Staff Member</h4>
              <p className="text-xs text-slate-500 mt-0.5">Add employee, assign role, and generate QR ID</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default DashboardPage;
