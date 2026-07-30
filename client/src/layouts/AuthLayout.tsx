import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ROUTES } from '../config/routes';
import { motion } from 'framer-motion';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  // If already authenticated, bypass login
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden px-4">
      {/* Animated Mesh Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-indigo-600/20 blur-[120px] mesh-move" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-violet-600/20 blur-[120px] mesh-move" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[20%] right-[20%] w-[40%] aspect-square rounded-full bg-cyan-600/20 blur-[120px] mesh-move" style={{ animationDelay: '4s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card-premium rounded-2xl p-8 shadow-2xl relative gradient-border-b">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Arshi Enterprise
            </h2>
            <p className="text-xs text-indigo-400 mt-1 font-semibold tracking-wider uppercase">
              Inventory & Staff Transfer Management System
            </p>
          </div>
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
};
