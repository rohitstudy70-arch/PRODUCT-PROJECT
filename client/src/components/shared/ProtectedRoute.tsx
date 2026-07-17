import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../config/routes';

interface ProtectedRouteProps {
  allowedRoles?: ('super_admin' | 'branch_admin' | 'store_manager' | 'security_guard' | 'staff')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not authorized for this specific route, send back to dashboard
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
};
