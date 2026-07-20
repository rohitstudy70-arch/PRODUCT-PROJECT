import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { ROUTES } from './config/routes';

// Import Feature Pages
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import BranchListPage from './features/branches/pages/BranchListPage';
import StaffListPage from './features/staff/pages/StaffListPage';
import ProductListPage from './features/products/pages/ProductListPage';
import InventoryPage from './features/inventory/pages/InventoryPage';
import TransferPage from './features/transfers/pages/TransferPage';
import SecurityGatePage from './features/security/pages/SecurityGatePage';
import { BranchReceivingPage } from './features/transfers/pages/BranchReceivingPage';
import AuditLogPage from './features/audit/pages/AuditLogPage';
import LiveTrackingPage from './features/tracking/pages/LiveTrackingPage';
import TrackingReportsPage from './features/tracking/pages/TrackingReportsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest Auth Layout */}
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path="/forgot-password" element={<div className="text-center p-4">Reset password request has been logged to console.</div>} />
        </Route>

        {/* Authenticated Dashboard Shell Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            
            {/* Super Admin Restricted */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
              <Route path={ROUTES.BRANCHES} element={<BranchListPage />} />
              <Route path={ROUTES.STAFF} element={<StaffListPage />} />
              <Route path={ROUTES.AUDIT} element={<AuditLogPage />} />
            </Route>

            {/* Live GPS Tracking & Reports */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'branch_admin']} />}>
              <Route path={ROUTES.TRACKING} element={<LiveTrackingPage />} />
              <Route path={ROUTES.TRACKING_REPORTS} element={<TrackingReportsPage />} />
            </Route>

            {/* General Logged in Access (internally scoped checks) */}
            <Route path={ROUTES.PRODUCTS} element={<ProductListPage />} />
            <Route path={ROUTES.INVENTORY} element={<InventoryPage />} />
            <Route path={ROUTES.TRANSFERS} element={<TransferPage />} />
            <Route path={ROUTES.RECEIVING} element={<BranchReceivingPage />} />

            {/* Security Guard / Admin Checks */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'security_guard']} />}>
              <Route path={ROUTES.SECURITY} element={<SecurityGatePage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
