import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Redirecciona inteligentemente al usuario logueado según su rol disponible.
 */
export default function RoleRedirect() {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Comprobar roles prioritariamente (en caso de usuarios con múltiples roles)
  if (user.roles.includes('ADMINISTRADOR')) {
    return <Navigate to="/dashboard/admin" replace />;
  }
  if (user.roles.includes('MESERO')) {
    return <Navigate to="/dashboard/waiter" replace />;
  }
  if (user.roles.includes('COCINERO')) {
    return <Navigate to="/dashboard/chef" replace />;
  }
  if (user.roles.includes('CAJERO')) {
    return <Navigate to="/dashboard/cashier" replace />;
  }

  return <Navigate to="/unauthorized" replace />;
}
