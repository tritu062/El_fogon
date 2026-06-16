import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Guardián de rutas basadas en autenticación y roles de usuario (RBAC).
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  // Mientras se está validando la sesión en el arranque
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-200">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Verificando credenciales...</p>
      </div>
    );
  }

  // Si no está autenticado, rebotamos al Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si el endpoint privado requiere roles específicos y el usuario no cuenta con ellos
  if (allowedRoles.length > 0) {
    const hasPermission = user.roles.some((role) => allowedRoles.includes(role));
    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Renderiza el componente hijo de la ruta privada (React Router Outlet)
  return <Outlet />;
}
