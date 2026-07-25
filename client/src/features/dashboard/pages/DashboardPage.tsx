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
import { IMEISearchBar } from '../components/IMEISearchBar';
import { ProductTransferPanel } from '../components/ProductTransferPanel';
import { RecentTransfersWidget } from '../components/RecentTransfersWidget';

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
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // IMEI Search & Sliding Panel States
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      if (user.role === 'super_admin' || user.role === 'branch_admin' || user.role === 'store_manager') {
        const [statsRes, transfersRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/transfers', { params: { limit: 10 } })
        ]);
        setStats(statsRes.data.data);
        setTransfers(transfersRes.data.data || []);
      } else {
        // Guard or Staff member: load transfers list instead (avoids 403)
        const response = await api.get('/transfers', { params: { limit: 100 } });
        setTransfers(response.data.data || []);

        if (user.role === 'security_guard') {
          const scansRes = await api.get('/security/scans', { params: { limit: 20 } });
          setHistoryLogs(scansRes.data.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setPanelOpen(true);
  };

  const handleTransferSuccess = () => {
    fetchDashboardData();
  };

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

        {/* SECURITY GUARD PERSONAL APPROVAL HISTORY LOG */}
        <Card className="glass-card border-indigo-500/20 bg-slate-950/70 mt-6">
          <CardHeader className="border-b border-slate-800/80 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>MY APPROVED CLEARANCE HISTORY LOG (सुरक्षा गार्ड अप्रूवल रिकॉर्ड लॉग)</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono border-slate-700 text-slate-300">
              Total Approved Logs: {historyLogs.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            {historyLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No security clearance approvals recorded by officer {user.firstName} {user.lastName} yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Approval Date & Time</th>
                      <th className="py-2.5 px-3">Courier / Staff Approved</th>
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

      {/* TOP PREMIUM SEARCH BAR SECTION */}
      <IMEISearchBar onSelectProduct={handleSelectProduct} />

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

      {/* RECENT TRANSFERS WIDGET */}
      <RecentTransfersWidget transfers={transfers} />

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

      {/* RIGHT SLIDING PRODUCT TRANSFER PANEL */}
      <ProductTransferPanel
        product={selectedProduct}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onTransferSuccess={handleTransferSuccess}
        adminUser={user}
      />
    </div>
  );
};
export default DashboardPage;
