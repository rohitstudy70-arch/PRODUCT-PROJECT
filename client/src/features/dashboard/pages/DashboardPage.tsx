import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { StatCard } from '../../../components/shared/StatCard';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { ROUTES } from '../../../config/routes';
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
  Boxes,
  ShieldAlert
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
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
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        if (user.role === 'super_admin' || user.role === 'branch_admin' || user.role === 'store_manager') {
          const response = await api.get('/dashboard/stats');
          setStats(response.data.data);
        } else {
          // Guard or Staff member: load transfers list instead (avoids 403)
          const response = await api.get('/transfers', { params: { limit: 100 } });
          setTransfers(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  // --- SECURITY GUARD DASHBOARD ---
  if (user?.role === 'security_guard') {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Gate Control Panel`}
          subtitle={`Logged in: Officer ${user.firstName} ${user.lastName} (${user.employeeId})`}
        />

        {/* Security Guard Welcome Card */}
        <Card className="border-indigo-950 bg-indigo-950/20 backdrop-blur-md">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-slate-100">Welcome to Gate Security Checkpoint</h3>
              <p className="text-xs text-slate-400">Scan courier staff IDs to retrieve and verify their cargo manifest before entry or exit clearance.</p>
            </div>
            <div>
              <Link to={ROUTES.SECURITY}>
                <Button className="flex items-center space-x-1.5 cursor-pointer">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Launch Security Gate</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Gate Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-indigo-600/10 rounded-full text-indigo-400">
              <Truck className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-200">EXIT CHECK-OUT (GATE EXIT)</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">Verify courier's outbound cargo details against approved manifest items before allowing warehouse exit.</p>
            </div>
            <Link to={`${ROUTES.SECURITY}?type=exit`} className="w-full">
              <Button variant="outline" className="w-full cursor-pointer hover:border-indigo-500 hover:text-indigo-400">
                Outbound Gate Exit Verify
              </Button>
            </Link>
          </Card>

          <Card className="glass-card p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-emerald-600/10 rounded-full text-emerald-400">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-200">ENTRY CHECK-IN (GATE ENTRY)</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">Verify courier's arriving cargo and clear gate admission into the destination branch premises.</p>
            </div>
            <Link to={`${ROUTES.SECURITY}?type=entry`} className="w-full">
              <Button variant="outline" className="w-full cursor-pointer hover:border-emerald-500 hover:text-emerald-400">
                Inbound Gate Entry Verify
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // --- COURIER / STAFF MEMBER DASHBOARD ---
  if (user?.role === 'staff') {
    const myTransfers = transfers.filter(
      t => t.assignedStaffId && 
           (t.assignedStaffId._id === user._id || t.assignedStaffId === user._id)
    );
    const activeDeliveries = myTransfers.filter(t => ['approved', 'preparing', 'ready_for_dispatch', 'in_transit'].includes(t.status));
    const completedDeliveries = myTransfers.filter(t => t.status === 'received');

    return (
      <div className="space-y-6">
        <PageHeader
          title={`My Logistics Portal`}
          subtitle={`Courier Staff: ${user.firstName} ${user.lastName} (${user.employeeId})`}
        />

        {/* Staff Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="My Active Manifests"
            value={activeDeliveries.length}
            icon={Truck}
            colorClass="text-indigo-400"
            description="Incoming / Pickups pending"
          />
          <StatCard
            title="Completed Deliveries"
            value={completedDeliveries.length}
            icon={CheckCircle}
            colorClass="text-emerald-400"
            description="Arrived & confirmed at destination"
          />
          <Card className="glass-card flex items-center justify-center p-6 text-center">
            <Link to={ROUTES.TRANSFERS} className="w-full">
              <Button className="w-full flex items-center justify-center space-x-1.5 py-5 cursor-pointer">
                <Boxes className="h-5 w-5" />
                <span>My Manifest Routes</span>
              </Button>
            </Link>
          </Card>
        </div>

        {/* Assigned Active Manifests Table */}
        <Card className="glass-card">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Truck className="h-5 w-5 text-indigo-400" />
              <span>My Assigned Delivery Manifests ({activeDeliveries.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeDeliveries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic text-sm">
                No active routes assigned to you at the moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-200">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                      <th className="p-4">Route ID</th>
                      <th className="p-4">Origin</th>
                      <th className="p-4">Destination</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {activeDeliveries.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-300">{t.transferId}</td>
                        <td className="p-4">{t.fromBranchId?.name}</td>
                        <td className="p-4">{t.toBranchId?.name}</td>
                        <td className="p-4 font-semibold">{t.totalItems} devices</td>
                        <td className="p-4">
                          <Badge variant={t.status === 'ready_for_dispatch' ? 'success' : 'warning'}>
                            {t.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Link to={ROUTES.TRANSFERS}>
                            <Button size="sm" variant="ghost" className="h-7 text-indigo-400 hover:text-indigo-350 cursor-pointer">
                              Open Manifest
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- DEFAULT COMMAND CENTER DASHBOARD (ADMINS) ---
  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center Dashboard"
        subtitle="Real-time multi-branch asset transfers and inventory health metrics"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to={ROUTES.PRODUCTS} className="block cursor-pointer">
          <StatCard
            title="Total Products"
            value={stats?.totalProducts || 0}
            icon={Package}
            colorClass="text-indigo-400"
            description="Assets registered in database"
          />
        </Link>
        <Link to={ROUTES.INVENTORY} className="block cursor-pointer">
          <StatCard
            title="Available Stock"
            value={stats?.availableProducts || 0}
            icon={CheckCircle}
            colorClass="text-emerald-400"
            description="Available for dispatch transfers"
          />
        </Link>
        <Link to={ROUTES.TRANSFERS} className="block cursor-pointer">
          <StatCard
            title="In Transit"
            value={stats?.inTransitProducts || 0}
            icon={Truck}
            colorClass="text-blue-400"
            description="Currently moving on routes"
          />
        </Link>
        <Link to={ROUTES.TRANSFERS} className="block cursor-pointer">
          <StatCard
            title="Assigned to Staff"
            value={stats?.assignedProducts || 0}
            icon={UserCheck}
            colorClass="text-purple-400"
            description="In custody of staff / field reps"
          />
        </Link>
        <Link to={ROUTES.PRODUCTS} className="block cursor-pointer">
          <StatCard
            title="Missing / Mismatch"
            value={stats?.missingProducts || 0}
            icon={AlertTriangle}
            colorClass="text-amber-400"
            description="Discrepancy alert items"
          />
        </Link>
        <Link to={ROUTES.TRANSFERS} className="block cursor-pointer">
          <StatCard
            title="Transfers Today"
            value={stats?.todayTransfers || 0}
            icon={ArrowRightLeft}
            colorClass="text-pink-400"
            description="New transfers registered today"
          />
        </Link>
        <Link to={ROUTES.TRANSFERS} className="block cursor-pointer">
          <StatCard
            title="Completed Transfers"
            value={stats?.completedTransfers || 0}
            icon={TrendingUp}
            colorClass="text-indigo-400"
            description="Successful inbound arrivals"
          />
        </Link>
        <Link to={ROUTES.AUDIT} className="block cursor-pointer">
          <StatCard
            title="Gate Scan Rejections"
            value={stats?.rejectedScans || 0}
            icon={XOctagon}
            colorClass="text-red-400"
            description="Failed security gate checks"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Branch stock allocation */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2 text-foreground">
              <Boxes className="h-5 w-5 text-indigo-400" />
              <span>Branch Stock Allocation Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.branchStocks && stats.branchStocks.length > 0 ? (
              <div className="space-y-4">
                {stats.branchStocks.map((branch, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{branch.branchName}</h4>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
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
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                No branch stock reports generated.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2 text-foreground">
              <Settings className="h-5 w-5 text-indigo-400" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={ROUTES.PRODUCTS} className="block">
              <div className="p-3 bg-muted/40 hover:bg-indigo-600/10 cursor-pointer rounded-lg border border-border transition-colors">
                <h4 className="text-sm font-bold text-foreground">Register New Asset</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Add products and auto-assign unique tags</p>
              </div>
            </Link>
            <Link to={ROUTES.TRANSFERS} className="block">
              <div className="p-3 bg-muted/40 hover:bg-indigo-600/10 cursor-pointer rounded-lg border border-border transition-colors">
                <h4 className="text-sm font-bold text-foreground">Initiate Asset Transfer</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Start a multi-branch logistical route</p>
              </div>
            </Link>
            {user?.role === 'super_admin' && (
              <Link to={ROUTES.STAFF} className="block">
                <div className="p-3 bg-muted/40 hover:bg-indigo-600/10 cursor-pointer rounded-lg border border-border transition-colors">
                  <h4 className="text-sm font-bold text-foreground">Onboard Staff Member</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Add employee, assign role, and generate QR ID</p>
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default DashboardPage;
