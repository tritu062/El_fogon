import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRedirect from './RoleRedirect';
import LoginPage from '../features/auth/pages/LoginPage';
import DashboardLayout from '../layouts/DashboardLayout';
import { AdminDashboard, WaiterDashboard, ChefDashboard, CashierDashboard } from '../features/dashboard/pages/Dashboards';
import SalonDashboard from '../features/tables/pages/SalonDashboard';
import AdminTablesConfig from '../features/tables/pages/AdminTablesConfig';
import AdminMenuConfig from '../features/catalog/pages/AdminMenuConfig';
import AdminUsersConfig from '../features/auth/pages/AdminUsersConfig';
import AdminAuditLogs from '../features/auth/pages/AdminAuditLogs';
import OrderTaking from '../features/orders/pages/OrderTaking';
import KitchenKds from '../features/kitchen/pages/KitchenKds';
import CashRegisterGate from '../features/cash/components/CashRegisterGate';
import PendingBillsList from '../features/bills/pages/PendingBillsList';
import CashRegisterControl from '../features/cash/pages/CashRegisterControl';
import TransactionsHistory from '../features/bills/pages/TransactionsHistory';
import InventoryDashboard from '../features/inventory/pages/InventoryDashboard';
import DailyConsumptionPage from '../features/inventory/pages/DailyConsumptionPage';
import ReportsDashboard from '../features/reports/pages/ReportsDashboard';

// Vista local rápida de Acceso Denegado (403)
function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-200 p-6 text-center">
      <div className="text-7xl mb-4">🛡️</div>
      <h1 className="text-4xl font-extrabold text-red-500 mb-2">Acceso Denegado (403)</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
        Tu cuenta no cuenta con los permisos o el rol administrativo necesario para visualizar este módulo.
      </p>
      <Link to="/" className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 text-white rounded-lg font-medium shadow-md shadow-brand-500/20 transition-all">
        Volver al Panel
      </Link>
    </div>
  );
}

/**
 * Orquestador principal de rutas.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      {/* La raíz redirige según el rol si ya está logueado, o al login si no */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Rutas Protegidas - Requieren autenticación base */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Index del dashboard redirige dinámicamente */}
          <Route index element={<RoleRedirect />} />

          {/* Rutas restringidas por roles específicos */}
          <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<AdminUsersConfig />} />
            <Route path="admin/tables" element={<AdminTablesConfig />} />
            <Route path="admin/menu" element={<AdminMenuConfig />} />
            <Route path="admin/audit" element={<AdminAuditLogs />} />
            <Route path="admin/inventory" element={<InventoryDashboard />} />
            <Route path="admin/inventory/daily" element={<DailyConsumptionPage />} />
            <Route path="admin/reports" element={<ReportsDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['MESERO', 'ADMINISTRADOR']} />}>
            <Route path="waiter" element={<WaiterDashboard />} />
            <Route path="waiter/tables" element={<SalonDashboard />} />
            <Route path="waiter/order" element={<OrderTaking />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['COCINERO', 'ADMINISTRADOR']} />}>
            <Route path="chef" element={<Navigate to="orders" replace />} />
            <Route path="chef/orders" element={<KitchenKds />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['CAJERO', 'ADMINISTRADOR']} />}>
            <Route path="cashier" element={<Navigate to="pending" replace />} />
            <Route path="cashier/pending" element={<CashRegisterGate><PendingBillsList /></CashRegisterGate>} />
            <Route path="cashier/closing" element={<CashRegisterGate><CashRegisterControl /></CashRegisterGate>} />
            <Route path="cashier/transactions" element={<CashRegisterGate><TransactionsHistory /></CashRegisterGate>} />
          </Route>
        </Route>
      </Route>

      {/* Comodín: Cualquier otra ruta rebotará al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
